'use strict';
const crearAuthController = require('./auth.controller.js');
const crearUsuarioController = require('./usuario.controller.js');
const crearRolController = require('./rol.controller.js');
const crearEspecialidadController = require('./especialidad.controller.js');
const crearCatalogoController = require('./catalogo.controller.js');
const crearAnuncioController = require('./anuncio.controller.js');
const crearHorarioController = require('./horario.controller.js');
const crearReservaController = require('./reserva.controller.js');
const crearPagoController = require('./pago.controller.js');
const crearAtencionController = require('./atencion.controller.js');




// ============================================================================
// 01. HELPERS HTTP -> controller.utils.js
// ============================================================================
class ErrorHttp extends Error {
  constructor(status, code, message) {
    super(message); this.name = 'ErrorHttp'; this.status = status; this.code = code;
  }
}
function incorrecto(message) { throw new ErrorHttp(400, 'SOLICITUD_INVALIDA', message); }
function esObjeto(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function cuerpo(req) {
  if (!esObjeto(req.body)) incorrecto('Envía un objeto JSON en el cuerpo de la solicitud.');
  return req.body;
}
function seleccionar(origen, campos) {
  const resultado = {};
  for (const campo of campos) {
    if (Object.hasOwn(origen, campo)) resultado[campo] = origen[campo];
  }
  return resultado;
}
function bodyCampos(req, campos) { return seleccionar(cuerpo(req), campos); }
function parametro(req, nombre) {
  const valor = req.params?.[nombre];
  if (typeof valor !== 'string' || !valor.trim()) incorrecto(`Falta el parámetro ${nombre}.`);
  return valor;
}
function idParametro(req, nombre) {
  const v = parametro(req, nombre);
  if (!/^[1-9]\d*$/.test(v)) incorrecto(`${nombre} debe ser un identificador positivo.`);
  return v;
}
function queryTexto(req, nombre, { obligatorio = false, defecto = undefined } = {}) {
  const v = req.query?.[nombre];
  if (v === undefined) {
    if (obligatorio) incorrecto(`Falta el filtro ${nombre}.`);
    return defecto;
  }
  if (typeof v !== 'string' || (obligatorio && !v.trim())) incorrecto(`${nombre} debe tener un único valor de texto.`);
  return v;
}
function queryId(req, nombre, obligatorio = false) {
  const v = queryTexto(req, nombre, { obligatorio, defecto: null });
  if (v === null) return null;
  if (!/^[1-9]\d*$/.test(v)) incorrecto(`${nombre} debe ser un identificador positivo.`);
  return v;
}
function queryEntero(req, nombre, defecto) {
  const v = queryTexto(req, nombre);
  if (v === undefined) return defecto;
  if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))) incorrecto(`${nombre} debe ser un entero no negativo.`);
  return Number(v);
}
function paginacion(req) {
  return { limite: queryEntero(req, 'limite', 50), desplazamiento: queryEntero(req, 'desplazamiento', 0) };
}
function contexto(req, obligatorio = true) {
  // express-session verifica la cookie y carga su registro del lado del servidor.
  const rut = req.session?.rut;
  if (rut === undefined || rut === null) {
    if (obligatorio) throw new ErrorHttp(401, 'SESION_REQUERIDA', 'Debes iniciar sesión.');
    return null;
  }
  if (typeof rut !== 'string' || !rut) throw new ErrorHttp(401, 'SESION_INVALIDA', 'La sesión no es válida.');
  return { rut };
}
function responder(res, datos, status = 200, mensaje) {
  const payload = { ok: true, datos };
  if (mensaje) payload.mensaje = mensaje;
  res.set('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}
function accion(fn) {
  // Captura errores sin depender del comportamiento exclusivo de Express 5.
  return (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
}
const camposContacto = ['nombres', 'apellidos', 'telefono', 'correo'];
const camposServicio = ['id_especialidad', 'id_tipo_precio', 'nombre', 'descripcion', 'precio', 'precio_oferta'];
const camposAnuncio = ['titulo', 'contenido', 'imagen_url', 'orden'];
const camposHorario = ['id_dia', 'hora_inicio', 'hora_fin'];
const camposPagoManual = ['id_medio', 'monto', 'referencia_transaccion', 'recibido'];
function datosReserva(req, { incluirCliente, incluirPago = false }) {
  const b = cuerpo(req);
  const datos = seleccionar(b, ['rut_especialista', 'id_especialidad', 'fecha_hora_inicio',
    'fecha_hora_fin', 'motivo', 'indicaciones']);
  if (incluirCliente) {
    if (!esObjeto(b.cliente)) incorrecto('Debes enviar cliente como objeto con sus datos.');
    datos.cliente = seleccionar(b.cliente, ['rut', ...camposContacto]);
  }
  if (incluirPago && b.pago != null) {
    if (!esObjeto(b.pago)) incorrecto('pago debe ser un objeto, o null si no se cobra abono.');
    datos.pago = seleccionar(b.pago, camposPagoManual);
  }
  // No trasladar id_estado, id_origen, retencion_hasta, password ni roles del body.
  return datos;
}

function crearNicolettController(servicios, opciones = {}) {
  if (!servicios?.auth || !servicios?.reservas) throw new TypeError('Se requiere la instancia creada por crearNicolettService(pool).');

  // ========================================================================
  // 02. SESIONES -> sesion.controller.utils.js
  // ========================================================================
  const nombreCookie = opciones.nombreCookieSesion ?? 'connect.sid';
  const cookieAlSalir = { path: opciones.pathCookieSesion ?? '/' };
  if (opciones.domainCookieSesion) cookieAlSalir.domain = opciones.domainCookieSesion;
  // Nombre/path/domain deben coincidir con la configuración de express-session.
  function exigirMiddlewareSesion(req) {
    if (!req.session || typeof req.session.regenerate !== 'function' ||
        typeof req.session.save !== 'function' || typeof req.session.destroy !== 'function') {
      throw new ErrorHttp(503, 'SESION_NO_CONFIGURADA', 'El inicio de sesión todavía no está configurado.');
    }
  }
  function operacionSesion(req, metodo) {
    return new Promise((resolve, reject) => {
      req.session[metodo](error => error ? reject(error) : resolve());
    });
  }
  async function guardarSesionNueva(req, rut) {
    await operacionSesion(req, 'regenerate');
    req.session.rut = rut;
    try { await operacionSesion(req, 'save'); }
    catch (e) {
      // Si falla la persistencia, no devolver un login exitoso.
      delete req.session.rut;
      try { await operacionSesion(req, 'destroy'); } catch {}
      throw e;
    }
  }

  // ========================================================================
  // 03. AUTENTICACIÓN -> auth.controller.js
  // ========================================================================
  const auth = crearAuthController({ accion, bodyCampos, camposContacto, contexto, cookieAlSalir, exigirMiddlewareSesion, guardarSesionNueva, nombreCookie, operacionSesion, parametro, responder, servicios });

  // ========================================================================
  // 04. USUARIOS -> usuario.controller.js
  // ========================================================================
  const usuarios = crearUsuarioController({ accion, bodyCampos, camposContacto, contexto, cuerpo, incorrecto, paginacion, parametro, queryTexto, responder, servicios });

  // ========================================================================
  // 05. ROLES -> rol.controller.js
  // ========================================================================
  const roles = crearRolController({ accion, contexto, cuerpo, idParametro, parametro, responder, servicios });

  // ========================================================================
  // 06. ESPECIALIDADES -> especialidad.controller.js
  // ========================================================================
  const especialidades = crearEspecialidadController({ accion, bodyCampos, contexto, cuerpo, idParametro, parametro, responder, servicios });

  // ========================================================================
  // 07. CATÁLOGOS Y SERVICIOS -> catalogo.controller.js / servicio.controller.js
  // ========================================================================
  const catalogo = crearCatalogoController({ accion, bodyCampos, camposServicio, contexto, cuerpo, idParametro, parametro, queryId, responder, servicios });

  // ========================================================================
  // 08. ANUNCIOS -> anuncio.controller.js
  // ========================================================================
  const anuncios = crearAnuncioController({ accion, bodyCampos, camposAnuncio, contexto, idParametro, responder, servicios });

  // ========================================================================
  // 09. HORARIOS Y DISPONIBILIDAD -> horario.controller.js
  // ========================================================================
  const horarios = crearHorarioController({ accion, bodyCampos, camposHorario, contexto, idParametro, parametro, queryId, queryTexto, responder, servicios });

  // ========================================================================
  // 10. RESERVAS -> reserva.controller.js
  // ========================================================================
  const reservas = crearReservaController({ accion, contexto, datosReserva, idParametro, paginacion, queryId, queryTexto, responder, servicios });

  // ========================================================================
  // 11. PAGOS -> pago.controller.js
  // ========================================================================
  const pagos = crearPagoController({ accion, bodyCampos, camposPagoManual, contexto, cuerpo, idParametro, paginacion, parametro, queryEntero, responder, servicios });

  // ========================================================================
  // 12. ATENCIONES E HISTORIAL -> atencion.controller.js
  // ========================================================================
  const atenciones = crearAtencionController({ accion, bodyCampos, contexto, idParametro, paginacion, parametro, queryId, queryTexto, responder, servicios });

  // ========================================================================
  // 13. ERRORES -> middlewares/error.middleware.js
  // ========================================================================
  // Montar DESPUÉS de todos los routers. Firma de cuatro argumentos obligatoria.
  function manejarError(error, req, res, next) {
    if (res.headersSent) return next(error);
    let status = 500, codigo = 'ERROR_INTERNO', mensaje = 'No fue posible completar la solicitud.';
    let detalles;
    if (error instanceof ErrorHttp || error?.name === 'ErrorServicio') {
      if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) status = error.status;
      if (status < 500) {
        codigo = error.code;
        mensaje = error.message;
        // Único detalle estructurado actualmente necesario y seguro.
        if (codigo === 'RESERVAS_AFECTADAS' && Array.isArray(error.detalles?.reservas)) {
          detalles = { reservas: error.detalles.reservas.map(String) };
        }
      } else if (['INTEGRACION_PENDIENTE', 'SESION_NO_CONFIGURADA'].includes(error.code)) {
        codigo = error.code;
        mensaje = error.message;
      }
    } else if (error?.type === 'entity.parse.failed') {
      status = 400; codigo = 'JSON_INVALIDO'; mensaje = 'El cuerpo de la solicitud no contiene JSON válido.';
    } else if (error?.type === 'entity.too.large') {
      status = 413; codigo = 'SOLICITUD_DEMASIADO_GRANDE'; mensaje = 'El cuerpo de la solicitud supera el tamaño permitido.';
    }
    // No registrar body, cookies, tokens, hashes ni parámetros SQL.
    // Si se proporciona registrarError, debe ser una función síncrona para
    // metadatos seguros; no debe volver a lanzar ni cambiar la respuesta HTTP.
    if (typeof opciones.registrarError === 'function' && status >= 500) {
      try { opciones.registrarError({ codigo, status, metodo: req.method }); } catch {}
    }
    const salida = { codigo, mensaje };
    if (detalles) salida.detalles = detalles;
    res.set('Cache-Control', 'no-store');
    return res.status(status).json({ ok: false, error: salida });
  }

  // ========================================================================
  // 14. EXPORTACIÓN -> mantener como índice al separar los controllers
  // ========================================================================
  return { auth, usuarios, roles, especialidades, catalogo, anuncios,
    horarios, reservas, pagos, atenciones, manejarError };
}

module.exports = crearNicolettController;
