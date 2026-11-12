'use strict';
const crearUsuarioRepository = require('./usuario.repository.js');
const crearCatalogoRepository = require('./catalogo.repository.js');
const crearRolRepository = require('./rol.repository.js');
const crearEspecialidadRepository = require('./especialidad.repository.js');
const crearServicioRepository = require('./servicio.repository.js');
const crearAnuncioRepository = require('./anuncio.repository.js');
const crearHorarioRepository = require('./horario.repository.js');
const crearReservaRepository = require('./reserva.repository.js');
const crearPagoRepository = require('./pago.repository.js');
const crearAtencionRepository = require('./atencion.repository.js');




function crearNicolettRepository(pool) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') {
    throw new TypeError('Se necesita una instancia Pool de pg.');
  }
  return construirRepositorios(pool, pool, null);
}

function construirRepositorios(db, pool, contexto) {
  // ========================================================================
  // 01. HELPERS Y TRANSACCIONES -> repository.utils.js / transaction.js
  // ========================================================================
  function comprobarVigencia() {
    if (contexto && !contexto.activo) throw new Error('La transacción ya terminó.');
  }
  function exigirTransaccion() {
    comprobarVigencia();
    if (!contexto) throw new Error('Usar este método dentro de conTransaccion().');
  }
  function errorRepositorio(codigo, mensaje) {
    const error = new Error(mensaje);
    error.code = codigo;
    return error;
  }
  async function varios(sql, valores = []) {
    comprobarVigencia();
    return (await db.query(sql, valores)).rows;
  }
  async function uno(sql, valores = []) {
    return (await varios(sql, valores))[0] ?? null;
  }
  function paginacion(limite = 50, desplazamiento = 0) {
    if (!Number.isInteger(limite) || limite < 1 || limite > 200 ||
        !Number.isInteger(desplazamiento) || desplazamiento < 0) {
      throw new RangeError('limite: entero 1..200; desplazamiento: entero >= 0.');
    }
    return [limite, desplazamiento];
  }
  const columnasUsuario = 'rut, nombres, apellidos, telefono, correo';

  async function conTransaccion(trabajo) {
    comprobarVigencia();
    if (contexto) throw new Error('No anidar conTransaccion(); reutilizar tx.');
    const client = await pool.connect();
    const estado = { activo: true };
    let conexionDanada;
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      const resultado = await trabajo(construirRepositorios(client, pool, estado));
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackError) { conexionDanada = rollbackError; }
      throw error;
    } finally {
      estado.activo = false;
      client.release(conexionDanada);
    }
  }

  // Bloquea la fila que representa a la especialista; no prueba su rol.
  // Si una operación afecta varias especialistas, bloquear RUT en orden
  // consistente (por ejemplo orden alfabético) para reducir deadlocks.
  async function bloquearEspecialista(rut) {
    exigirTransaccion();
    const fila = await uno('SELECT rut FROM usuario WHERE rut = $1 FOR UPDATE', [rut]);
    if (!fila) throw errorRepositorio('USUARIO_NO_EXISTE', 'No existe la especialista.');
    return fila;
  }
  async function bloquearReserva(idReserva) {
    exigirTransaccion();
    const referencia = await uno(
      'SELECT rut_especialista FROM reserva WHERE id_reserva = $1', [idReserva]);
    if (!referencia) return null;
    await bloquearEspecialista(referencia.rut_especialista);
    return uno('SELECT * FROM reserva WHERE id_reserva = $1 FOR UPDATE', [idReserva]);
  }

  // ========================================================================
  // 02. USUARIOS -> usuario.repository.js
  // ========================================================================

  // ========================================================================
  const usuarios = crearUsuarioRepository({ columnasUsuario, db, exigirTransaccion, paginacion, uno, varios });
  // 03. CATÁLOGOS Y ROLES -> catalogo.repository.js / rol.repository.js
  // ========================================================================
  // Identificadores SQL exclusivamente de esta lista interna. NUNCA del cliente.
  const tablasCatalogo = Object.freeze({
    rol: ['rol', 'id_rol'], tipo_precio: ['tipo_precio', 'id_tipo_precio'],
    dia_semana: ['dia_semana', 'id_dia'], origen_reserva: ['origen_reserva', 'id_origen'],
    estado_reserva: ['estado_reserva', 'id_estado'], medio_pago: ['medio_pago', 'id_medio']
  });
  function obtenerCatalogo(nombre) {
    if (!Object.hasOwn(tablasCatalogo, nombre)) throw new Error('Catálogo no permitido.');
    return tablasCatalogo[nombre];
  }
  const catalogos = crearCatalogoRepository({ obtenerCatalogo, uno, varios });
  const roles = crearRolRepository({ exigirTransaccion, uno, varios });

  // ========================================================================
  // 04. ESPECIALIDADES Y ESPECIALISTAS -> especialidad.repository.js
  // ========================================================================
  const especialidades = crearEspecialidadRepository({ exigirTransaccion, uno, varios });

  // ========================================================================
  // 05. CATÁLOGO DE SERVICIOS -> servicio.repository.js
  // ========================================================================
  const servicios = crearServicioRepository({ uno, varios });

  // ========================================================================
  // 06. ANUNCIOS -> anuncio.repository.js
  // ========================================================================
  const anuncios = crearAnuncioRepository({ uno, varios });

  // ========================================================================
  // 07. HORARIOS -> horario.repository.js
  // ========================================================================
  const horarios = crearHorarioRepository({ bloquearEspecialista, exigirTransaccion, uno, varios });

  // ========================================================================
  // 08. RESERVAS Y AGENDA -> reserva.repository.js
  // ========================================================================
  const seleccionReserva = `SELECT r.*,er.nombre AS estado,ori.nombre AS origen,
    e.nombre AS especialidad,u.nombres AS nombres_cliente,u.apellidos AS apellidos_cliente,
    u.telefono AS telefono_cliente,u.correo AS correo_cliente,
    esp.nombres AS nombres_especialista,esp.apellidos AS apellidos_especialista,
    p.id_pago,p.monto AS monto_abono FROM reserva r
    JOIN estado_reserva er USING(id_estado) JOIN origen_reserva ori USING(id_origen)
    JOIN especialidad e USING(id_especialidad) JOIN usuario u ON u.rut=r.rut_cliente
    JOIN usuario esp ON esp.rut=r.rut_especialista LEFT JOIN pago p USING(id_reserva)`;

  async function insertarReserva(d, origen, estado) {
    exigirTransaccion();
    await bloquearEspecialista(d.rut_especialista);
    const cruces = await reservas.buscarSolapamientos({
      rutEspecialista: d.rut_especialista, inicio: d.fecha_hora_inicio, fin: d.fecha_hora_fin
    });
    if (cruces.length) throw errorRepositorio('HORARIO_OCUPADO', 'El intervalo ya está ocupado.');
    const fila = await uno(`INSERT INTO reserva(rut_cliente,rut_especialista,id_especialidad,
      id_origen,id_estado,fecha_hora_inicio,fecha_hora_fin,motivo,indicaciones,retencion_hasta)
      SELECT $1,$2,$3,o.id_origen,e.id_estado,$4,$5,$6,$7,$8
      FROM origen_reserva o CROSS JOIN estado_reserva e
      WHERE upper(o.nombre)=$9 AND upper(e.nombre)=$10 RETURNING *`,
    [d.rut_cliente, d.rut_especialista, d.id_especialidad, d.fecha_hora_inicio,
      d.fecha_hora_fin, d.motivo ?? '', d.indicaciones ?? '', d.retencion_hasta ?? null, origen, estado]);
    if (!fila) throw errorRepositorio('CATALOGO_INCOMPLETO', 'Falta origen o estado de reserva.');
    return fila;
  }
  const reservas = crearReservaRepository({ bloquearEspecialista, bloquearReserva, errorRepositorio, insertarReserva, paginacion, seleccionReserva, uno, varios });

  // ========================================================================
  // 09. PAGOS RECIBIDOS -> pago.repository.js
  // ========================================================================
  const pagos = crearPagoRepository({ bloquearReserva, errorRepositorio, paginacion, uno, varios });

  // ========================================================================
  // 10. ATENCIONES E HISTORIAL -> atencion.repository.js
  // ========================================================================
  const seleccionAtencion = `SELECT a.*,r.rut_cliente,r.rut_especialista,r.id_especialidad,
    r.fecha_hora_inicio AS fecha_atencion,e.nombre AS especialidad,
    u.nombres AS nombres_especialista,u.apellidos AS apellidos_especialista
    FROM atencion a JOIN reserva r USING(id_reserva)
    JOIN especialidad e USING(id_especialidad) JOIN usuario u ON u.rut=r.rut_especialista`;
  const atenciones = crearAtencionRepository({ bloquearReserva, paginacion, seleccionAtencion, uno, varios });

  // ========================================================================
  // 11. EXPORTACIÓN: misma interfaz para lecturas normales y dentro de tx.
  // ========================================================================
  return { conTransaccion, usuarios, catalogos, roles, especialidades,
    servicios, anuncios, horarios, reservas, pagos, atenciones };
}

module.exports = crearNicolettRepository;
