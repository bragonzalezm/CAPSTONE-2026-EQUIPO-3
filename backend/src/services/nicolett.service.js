'use strict';
const crearAuthService = require('./auth.service.js');
const crearUsuarioService = require('./usuario.service.js');
const crearRolService = require('./rol.service.js');
const crearEspecialidadService = require('./especialidad.service.js');
const crearCatalogoService = require('./catalogo.service.js');
const crearAnuncioService = require('./anuncio.service.js');
const crearHorarioService = require('./horario.service.js');
const crearReservaService = require('./reserva.service.js');
const crearPagoService = require('./pago.service.js');
const crearAtencionService = require('./atencion.service.js');


const { scrypt, randomBytes, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const crearNicolettRepository = require('../repositories/nicolett.repository');
const scryptAsync = promisify(scrypt);



// ============================================================================
// 01. ERRORES Y VALIDACIONES -> service.utils.js / errors/servicio.error.js
// ============================================================================
class ErrorServicio extends Error {
  constructor(status, code, message, detalles) {
    super(message); this.name = 'ErrorServicio';
    this.status = status; this.code = code;
    if (detalles !== undefined) this.detalles = detalles;
  }
}
function fallar(code, message, status = 400, detalles) {
  throw new ErrorServicio(status, code, message, detalles);
}
function objeto(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) fallar('DATOS_INVALIDOS', 'Debes enviar un objeto con los datos solicitados.');
  return valor;
}
function texto(valor, campo, max, opcional = false) {
  if (opcional && (valor === undefined || valor === null)) return '';
  if (typeof valor !== 'string') fallar('DATOS_INVALIDOS', `${campo} debe ser texto.`);
  const limpio = valor.trim();
  if ((!opcional && !limpio) || limpio.length > max) fallar('DATOS_INVALIDOS', `${campo} no es válido (máximo ${max} caracteres).`);
  return limpio;
}
function id(valor, campo = 'id') {
  const s = String(valor ?? '');
  if (!/^[1-9]\d*$/.test(s) || BigInt(s) > 9223372036854775807n) fallar('DATOS_INVALIDOS', `${campo} no es válido.`);
  return s;
}
function entero(valor, campo, min = 0, max = 2147483647) {
  if (!Number.isInteger(valor) || valor < min || valor > max) fallar('DATOS_INVALIDOS', `${campo} debe ser un entero entre ${min} y ${max}.`);
  return valor;
}
function booleano(valor, campo) {
  if (typeof valor !== 'boolean') fallar('DATOS_INVALIDOS', `${campo} debe ser booleano.`);
  return valor;
}
function rutValido(valor) {
  const rut = texto(valor, 'rut', 20).replace(/[.\s-]/g, '').toUpperCase();
  if (!/^[1-9]\d{0,7}[0-9K]$/.test(rut)) fallar('RUT_INVALIDO', 'El RUT no es válido.');
  const cuerpo = rut.slice(0, -1); let suma = 0, factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor; factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - suma % 11;
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  if (dv !== rut.slice(-1)) fallar('RUT_INVALIDO', 'El dígito verificador no corresponde.');
  return `${cuerpo}-${dv}`;
}
function correoValido(valor, obligatorio = false) {
  const v = texto(valor, 'correo', 254, !obligatorio);
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fallar('CORREO_INVALIDO', 'El correo no es válido.');
  return v;
}
function contacto(d, correoObligatorio = false) {
      objeto(d);
  const telefono = texto(d.telefono, 'telefono', 25);
  if (!/^[+\d\s()-]{6,25}$/.test(telefono)) fallar('TELEFONO_INVALIDO', 'El teléfono no es válido.');
  return { nombres: texto(d.nombres, 'nombres', 100), apellidos: texto(d.apellidos, 'apellidos', 100),
    telefono, correo: correoValido(d.correo, correoObligatorio) };
}
function passwordValida(v) {
  if (typeof v !== 'string' || v.length < 12 || v.length > 128) {
    fallar('PASSWORD_INVALIDA', 'La contraseña debe tener entre 12 y 128 caracteres.');
  }
  return v;
}
function confirmarPassword(d) {
      objeto(d);
  const p = passwordValida(d.password);
  if (p !== d.confirmacion_password) fallar('PASSWORD_NO_COINCIDE', 'Las contraseñas no coinciden.');
  return p;
}
function timestamp(v, campo) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)) {
    fallar('FECHA_INVALIDA', `${campo} debe ser ISO 8601 con zona horaria.`);
  }
  fechaLocalValida(v.slice(0, 10));
  const n = Date.parse(v);
  if (!Number.isFinite(n)) fallar('FECHA_INVALIDA', `${campo} no es válido.`);
  return new Date(n).toISOString();
}
function fechaLocalValida(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) {
    fallar('FECHA_INVALIDA', 'La fecha debe existir y tener formato YYYY-MM-DD.');
  }
  return v;
}
function hora(v) {
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(v)) fallar('HORA_INVALIDA', 'Usar HH:MM o HH:MM:SS.');
  return v.length === 5 ? `${v}:00` : v;
}
const formateadorFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit'
});
function fechaChile(v) {
  const partes = Object.fromEntries(formateadorFecha.formatToParts(new Date(v)).map(p => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}
const igual = (a, b) => String(a) === String(b);
const mayus = v => String(v).toUpperCase();
function requerido(v, mensaje = 'No se encontró el registro.') {
  if (!v) fallar('NO_ENCONTRADO', mensaje, 404); return v;
}
function pagina(d = {}) {
  return { limite: entero(d.limite ?? 50, 'limite', 1, 200),
    desplazamiento: entero(d.desplazamiento ?? 0, 'desplazamiento') };
}
function urlImagen(v) {
  const s = texto(v, 'imagen_url', 2048, true);
  if (!s) return null;
  try { const u = new URL(s); if (u.protocol === 'https:' && !u.username && !u.password) return u.href; } catch {}
  fallar('URL_INVALIDA', 'La imagen debe usar una URL HTTPS sin credenciales.');
}

// ============================================================================
// 02. HASH DE CONTRASEÑAS -> password.service.js (sin dependencia adicional)
// ============================================================================
const parametrosScrypt = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
async function generarHash(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64, parametrosScrypt);
  return `scrypt$32768$8$3$${salt}$${hash.toString('hex')}`;
}
async function verificarHash(password, almacenado) {
  if (typeof password !== 'string' || password.length > 128 || typeof almacenado !== 'string') return false;
  const partes = almacenado.split('$');
  if (partes.length !== 6 || partes.slice(0, 4).join('$') !== 'scrypt$32768$8$3' ||
      !/^[a-f0-9]{32}$/.test(partes[4]) || !/^[a-f0-9]{128}$/.test(partes[5])) return false;
  const calculado = await scryptAsync(password, partes[4], 64, parametrosScrypt);
  return timingSafeEqual(calculado, Buffer.from(partes[5], 'hex'));
}

function crearNicolettService(pool, opciones = {}) {
  const repository = crearNicolettRepository(pool);
  const ahora = opciones.ahora ?? (() => new Date());
  const abonoActual = entero(opciones.montoAbono ?? 5000, 'montoAbono', 1);
  const minutosRetencion = 10;

  // ========================================================================
  // 03. AUTORIZACIÓN Y HELPERS COMPARTIDOS -> permisos.service.js
  // ========================================================================
  async function actor(contexto, repo = repository) {
    if (!contexto?.rut) fallar('SESION_REQUERIDA', 'Debes iniciar sesión.', 401);
    const rut = rutValido(contexto.rut);
    const u = await repo.usuarios.buscarParaAutenticacion(rut);
    if (!u?.password) fallar('SESION_INVALIDA', 'La cuenta no está habilitada.', 401);
    const roles = await repo.roles.listarPorUsuario(rut);
    return { rut, roles: roles.map(r => mayus(r.nombre)) };
  }
  async function administrador(ctx, repo = repository) {
    const a = await actor(ctx, repo);
    if (!a.roles.includes('ADMINISTRADOR')) fallar('SIN_PERMISO', 'Se requiere rol Administrador.', 403);
    return a;
  }
  async function personal(ctx, repo = repository) {
    const a = await actor(ctx, repo);
    if (!a.roles.some(r => ['ADMINISTRADOR', 'ESPECIALISTA'].includes(r))) fallar('SIN_PERMISO', 'Se requiere acceso del personal.', 403);
    return a;
  }
  async function agendaPropia(ctx, rut, repo = repository) {
    const a = await personal(ctx, repo);
    if (!a.roles.includes('ADMINISTRADOR') && a.rut !== rut) fallar('SIN_PERMISO', 'Solo puedes gestionar tu propia agenda.', 403);
    return a;
  }
  async function catalogoPorNombre(repo, tabla, nombre) {
    return requerido(await repo.catalogos.buscarPorNombre(tabla, nombre), `Falta ${nombre} en ${tabla}.`);
  }
  async function catalogoPorId(repo, tabla, clave, valor) {
    const registros = await repo.catalogos.listar(tabla);
    return requerido(registros.find(r => igual(r[clave], valor)), `No existe ese valor en ${tabla}.`);
  }
  async function especialistaHabilitada(repo, rut, idEspecialidad) {
    const u = requerido(await repo.usuarios.buscarParaAutenticacion(rut));
    const roles = await repo.roles.listarPorUsuario(rut);
    if (!u.password || !roles.some(r => mayus(r.nombre) === 'ESPECIALISTA')) fallar('ESPECIALISTA_NO_HABILITADA', 'La persona no está habilitada para atender.', 409);
    if (idEspecialidad !== undefined) {
      const lista = await repo.especialidades.listarPorUsuario(rut);
      if (!lista.some(e => igual(e.id_especialidad, idEspecialidad) && e.activa)) {
        fallar('ESPECIALIDAD_NO_HABILITADA', 'La especialista no atiende esa especialidad activa.', 409);
      }
    }
  }
  function intervalo(d, futuro = true) {
      objeto(d);
    const inicio = timestamp(d.fecha_hora_inicio, 'fecha_hora_inicio');
    const fin = timestamp(d.fecha_hora_fin, 'fecha_hora_fin');
    if (Date.parse(fin) <= Date.parse(inicio)) fallar('INTERVALO_INVALIDO', 'El término debe ser posterior al inicio.');
    if (futuro && Date.parse(inicio) <= ahora().getTime()) fallar('FECHA_PASADA', 'El horario debe ser futuro.');
    if (fechaChile(inicio) !== fechaChile(fin)) fallar('INTERVALO_INVALIDO', 'El bloque debe estar dentro de un mismo día local.');
    return { fecha_hora_inicio: inicio, fecha_hora_fin: fin };
  }
  async function comprobarBloque(repo, rut, inicio, fin, exigirLibre = true) {
    const fecha = fechaChile(inicio);
    const bloques = await repo.horarios.listarBloques({ rutEspecialista: rut, desde: fecha, hasta: fecha });
    const b = bloques.find(x => new Date(x.inicio).getTime() === Date.parse(inicio) && new Date(x.fin).getTime() === Date.parse(fin));
    if (!b) fallar('FUERA_DE_HORARIO', 'El intervalo no corresponde a un bloque de atención.', 409);
    if (exigirLibre && !b.disponible) fallar('HORARIO_OCUPADO', 'El horario ya no está disponible.', 409);
    return b;
  }
  function datosReserva(d) {
      objeto(d);
    return { rut_especialista: rutValido(d.rut_especialista), id_especialidad: id(d.id_especialidad),
      ...intervalo(d), motivo: texto(d.motivo, 'motivo', 2000, true),
      indicaciones: texto(d.indicaciones, 'indicaciones', 5000, true) };
  }
  // Resumen sin contactos de la ficha: seguro para devolver a un invitado.
  function resumenReserva(r) {
    return { id_reserva: r.id_reserva, rut_especialista: r.rut_especialista,
      id_especialidad: r.id_especialidad, fecha_hora_inicio: r.fecha_hora_inicio,
      fecha_hora_fin: r.fecha_hora_fin, motivo: r.motivo, indicaciones: r.indicaciones,
      id_estado: r.id_estado, id_origen: r.id_origen, retencion_hasta: r.retencion_hasta };
  }
  function datosServicio(d) {
      objeto(d);
    const precio = entero(d.precio, 'precio');
    const oferta = d.precio_oferta == null ? null : entero(d.precio_oferta, 'precio_oferta');
    if (oferta !== null && oferta >= precio) fallar('OFERTA_INVALIDA', 'La oferta debe ser inferior al precio habitual.');
    return { id_especialidad: id(d.id_especialidad), id_tipo_precio: id(d.id_tipo_precio),
      nombre: texto(d.nombre, 'nombre', 150), descripcion: texto(d.descripcion, 'descripcion', 10000, true),
      precio, precio_oferta: oferta };
  }
  function datosAnuncio(d) {
      objeto(d);
    return { titulo: texto(d.titulo, 'titulo', 150), contenido: texto(d.contenido, 'contenido', 10000),
      imagen_url: urlImagen(d.imagen_url), orden: entero(d.orden ?? 0, 'orden') };
  }

  // ========================================================================
  // 04. AUTENTICACIÓN -> auth.service.js
  // ========================================================================
  const auth = crearAuthService({ actor, administrador, catalogoPorNombre, confirmarPassword, contacto, correoValido, fallar, generarHash, objeto, repository, requerido, rutValido, verificarHash });

  // ========================================================================
  // 05. USUARIOS, ROLES Y FICHAS -> usuario.service.js / rol.service.js
  // ========================================================================
  const usuarios = crearUsuarioService({ actor, administrador, contacto, pagina, personal, repository, requerido, rutValido, texto });
  const roles = crearRolService({ administrador, catalogoPorId, catalogoPorNombre, fallar, id, igual, mayus, repository, requerido, rutValido });

  // ========================================================================
  // 06. ESPECIALIDADES Y CATÁLOGO -> especialidad.service.js / catalogo.service.js
  // ========================================================================
  const especialidades = crearEspecialidadService({ administrador, booleano, especialistaHabilitada, id, repository, requerido, rutValido, texto });
  const catalogo = crearCatalogoService({ administrador, booleano, catalogoPorId, datosServicio, fallar, id, repository, requerido });

  // ========================================================================
  // 07. ANUNCIOS -> anuncio.service.js
  // ========================================================================
  const anuncios = crearAnuncioService({ administrador, booleano, datosAnuncio, id, repository, requerido });

  // ========================================================================
  // 08. HORARIOS Y DISPONIBILIDAD -> horario.service.js
  // ========================================================================
  function datosHorario(d) {
      objeto(d);
    const inicio = hora(d.hora_inicio), fin = hora(d.hora_fin);
    if (fin <= inicio) fallar('INTERVALO_INVALIDO', 'La hora final debe ser posterior a la inicial.');
    return { id_dia: entero(d.id_dia, 'id_dia', 1, 7), hora_inicio: inicio, hora_fin: fin };
  }
  async function validarHorarioSinCruces(tx, rut, datos, excluirId = null) {
    const existentes = await tx.horarios.listarPorEspecialista(rut);
    if (existentes.some(h => !igual(h.id_horario, excluirId) && igual(h.id_dia, datos.id_dia) &&
        h.hora_inicio < datos.hora_fin && h.hora_fin > datos.hora_inicio)) {
      fallar('HORARIOS_SUPERPUESTOS', 'El bloque se cruza con otro horario semanal.', 409);
    }
  }
  async function comprobarReservasConservadas(tx, rut) {
    const futuras = await tx.reservas.listarAgenda({ rutEspecialista: rut,
      desde: ahora().toISOString(), hasta: '9999-12-31T23:59:59Z' });
    const afectadas = [];
    for (const r of futuras) {
      const ocupa = mayus(r.estado) === 'CONFIRMADA' || (mayus(r.estado) === 'PENDIENTE' &&
        (r.id_pago || !r.retencion_hasta || new Date(r.retencion_hasta) > ahora()));
      if (!ocupa) continue;
      try { await comprobarBloque(tx, rut, new Date(r.fecha_hora_inicio).toISOString(), new Date(r.fecha_hora_fin).toISOString(), false); }
      catch (e) { if (e.code !== 'FUERA_DE_HORARIO') throw e; afectadas.push(r.id_reserva); }
    }
    if (afectadas.length) fallar('RESERVAS_AFECTADAS', 'Cancela o resuelve estas reservas antes de cambiar el horario.', 409, { reservas: afectadas });
  }
  const horarios = crearHorarioService({ agendaPropia, comprobarReservasConservadas, datosHorario, especialistaHabilitada, fallar, fechaLocalValida, id, igual, repository, requerido, rutValido, validarHorarioSinCruces });

  // ========================================================================
  // 09. RESERVAS Y AGENDA -> reserva.service.js
  // ========================================================================
  const reservas = crearReservaService({ abonoActual, actor, agendaPropia, ahora, comprobarBloque, contacto, datosReserva, especialistaHabilitada, fallar, id, mayus, minutosRetencion, pagina, personal, registrarManualTx, repository, requerido, resumenReserva, rutValido, timestamp });

  // ========================================================================
  // 10. PAGOS RECIBIDOS -> pago.service.js
  // ========================================================================
  async function registrarManualTx(tx, ctx, rid, d) {
      objeto(d);
    const r = requerido(await tx.reservas.bloquearPorId(rid));
    await agendaPropia(ctx, r.rut_especialista, tx);
    const completa = requerido(await tx.reservas.buscarPorId(rid));
    if (mayus(completa.origen) !== 'PERSONAL' || mayus(completa.estado) !== 'CONFIRMADA') {
      fallar('PAGO_MANUAL_NO_PERMITIDO', 'El abono manual corresponde a una reserva manual confirmada.', 409);
    }
    if (d.recibido !== true) fallar('PAGO_NO_RECIBIDO', 'Registra el abono solo después de recibirlo.');
    const medio = await catalogoPorId(tx, 'medio_pago', 'id_medio', id(d.id_medio));
    if (!['EFECTIVO', 'TRANSFERENCIA', 'POS LOCAL', 'POS_LOCAL'].includes(mayus(medio.nombre))) {
      fallar('MEDIO_NO_MANUAL', 'Selecciona efectivo, transferencia o POS local.');
    }
    return tx.pagos.registrarRecibido({ id_reserva: rid, id_medio: medio.id_medio,
      monto: entero(d.monto ?? abonoActual, 'monto', 1),
      referencia_transaccion: texto(d.referencia_transaccion, 'referencia_transaccion', 150, true) || null });
  }
  const pagos = crearPagoService({ actor, administrador, ahora, catalogoPorNombre, comprobarBloque, entero, especialistaHabilitada, fallar, id, mayus, opciones, pagina, personal, registrarManualTx, repository, requerido, rutValido, texto });

  // ========================================================================
  // 11. ATENCIONES E HISTORIAL -> atencion.service.js
  // ========================================================================
  const atenciones = crearAtencionService({ agendaPropia, ahora, fallar, id, igual, objeto, pagina, personal, repository, requerido, rutValido, texto });

  // ========================================================================
  // 12. TRADUCCIÓN DE ERRORES Y EXPORTACIÓN -> service.utils.js / index.js
  // ========================================================================
  function envolver(grupo) {
    return Object.fromEntries(Object.entries(grupo).map(([nombre, fn]) => [nombre, async (...args) => {
      try { return await fn(...args); }
      catch (e) {
        if (e instanceof ErrorServicio) throw e;
        const mapa = {
          '23505': [409, 'REGISTRO_DUPLICADO', 'El registro ya existe o ya fue utilizado.'],
          '23503': [409, 'RELACION_EXISTENTE', 'No se puede guardar o quitar el registro por sus relaciones.'],
          '23514': [400, 'RESTRICCION_BD', 'Los datos no cumplen una restricción de la base de datos.'],
          '23502': [400, 'CAMPO_OBLIGATORIO', 'Falta un campo obligatorio.'],
          '23P01': [409, 'HORARIO_OCUPADO', 'El intervalo ya está ocupado.'],
          '40001': [409, 'CONFLICTO_CONCURRENTE', 'La operación coincidió con otro cambio; vuelve a intentarlo.'],
          '40P01': [409, 'CONFLICTO_CONCURRENTE', 'La operación coincidió con otro cambio; vuelve a intentarlo.'],
          HORARIO_OCUPADO: [409, 'HORARIO_OCUPADO', 'El intervalo ya está ocupado.'],
          PAGO_CONFLICTIVO: [409, 'PAGO_CONFLICTIVO', 'La reserva o referencia ya tiene otro pago.'],
          USUARIO_NO_EXISTE: [404, 'NO_ENCONTRADO', 'No existe la especialista.'],
          RESERVA_NO_EXISTE: [404, 'NO_ENCONTRADO', 'No existe la reserva.']
        };
        const [status, code, message] = mapa[e.code] ?? [500, 'ERROR_INTERNO', 'No fue posible completar la operación.'];
        const error = new ErrorServicio(status, code, message); error.cause = e; throw error;
      }
    }]));
  }
  return Object.fromEntries(Object.entries({ auth, usuarios, roles, especialidades, catalogo,
    anuncios, horarios, reservas, pagos, atenciones }).map(([nombre, grupo]) => [nombre, envolver(grupo)]));
}

module.exports = crearNicolettService;
module.exports.ErrorServicio = ErrorServicio;
