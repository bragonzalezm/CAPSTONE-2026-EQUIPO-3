'use strict';

const { createHash, randomBytes } = require('node:crypto');
const { Router, urlencoded } = require('express');
const crearNicolettRepository = require('../repositories/nicolett.repository');
const crearGoogleCalendarService = require('./google-calendar.service');

const MONTO = 5000;
const HOST = 'https://webpay3gint.transbank.cl';
const TRANSACCIONES = HOST + '/rswebpaytransaction/api/webpay/v1.2/transactions';
// Credenciales públicas que Transbank documenta para Webpay Plus en integración.
const CABECERAS = {
  'Tbk-Api-Key-Id': '597055555532',
  'Tbk-Api-Key-Secret': '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
  'Content-Type': 'application/json'
};
const MENSAJES = {
  CONFIRMADA: 'Pago de prueba aprobado. Tu reserva quedó confirmada.',
  REALIZADA: 'El pago de prueba ya está registrado. La atención se realizó.',
  CANCELADA: 'Esta reserva fue cancelada.',
  PAGO_YA_REGISTRADO: 'El pago de prueba ya está registrado.',
  RECHAZADO: 'Webpay rechazó el pago de prueba. La hora quedó liberada.',
  CANCELADO: 'Saliste de Webpay. Si el pago quedó incompleto, la retención vence automáticamente.',
  PENDIENTE: 'Todavía no se pudo confirmar el resultado del pago de prueba.',
  REQUIERE_REVISION: 'Webpay aprobó el pago de prueba. La reserva requiere revisión.',
  SIN_RESULTADO: 'El retorno no contiene una transacción activa de Nicolett.'
};

function huella(token) {
  return createHash('sha256').update(token).digest('hex');
}

function tokenValido(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

function errorInicio() {
  const error = new Error('No pudimos iniciar el pago de prueba. Intenta de nuevo.');
  error.name = 'ErrorServicio';
  error.code = 'WEBPAY_NO_DISPONIBLE';
  error.status = 502;
  return error;
}

function crearWebpayPrueba(pool, { enviar = globalThis.fetch } = {}) {
  const url = new URL(process.env.WEBPAY_ORIGEN || 'http://localhost:5173');
  if (!['http:', 'https:'].includes(url.protocol) || url.href !== url.origin + '/') {
    throw new Error('WEBPAY_ORIGEN debe ser el origen del frontend, por ejemplo http://localhost:5173.');
  }
  const retorno = url.origin + '/api/pagos/webpay/retorno';
  const repository = crearNicolettRepository(pool);
  const calendario = crearGoogleCalendarService(repository);

  async function consultar(metodo, token, cuerpo) {
    const destino = token ? TRANSACCIONES + '/' + token : TRANSACCIONES;
    const respuesta = await enviar(destino, {
      method: metodo,
      headers: CABECERAS,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(12000)
    });
    if (!respuesta.ok) throw new Error('Webpay devolvió HTTP ' + respuesta.status);
    return respuesta.json();
  }

  async function iniciar(idReserva) {
    const orden = 'NC' + randomBytes(12).toString('hex');
    const sesion = randomBytes(24).toString('hex');
    const respuesta = await consultar('POST', null, {
      buy_order: orden,
      session_id: sesion,
      amount: MONTO,
      return_url: retorno
    });
    if (!tokenValido(respuesta.token) ||
        respuesta.url !== HOST + '/webpayserver/initTransaction') {
      throw new Error('Respuesta inesperada al iniciar Webpay de prueba.');
    }
    await pool.query(
      'INSERT INTO webpay_transaccion (id_reserva, orden, sesion, huella_token) VALUES ($1,$2,$3,$4)',
      [idReserva, orden, sesion, huella(respuesta.token)]
    );
    return { url: respuesta.url, token: respuesta.token };
  }

  async function buscarTransaccion(token) {
    if (!tokenValido(token)) return null;
    const { rows } = await pool.query(
      'SELECT id_reserva, orden, sesion FROM webpay_transaccion WHERE huella_token = $1',
      [huella(token)]
    );
    return rows[0] || null;
  }

  async function verificarResultado(token) {
    const propia = await buscarTransaccion(token);
    if (!propia) return null;

    let respuesta;
    try {
      respuesta = await consultar('PUT', token);
    } catch {
      // Un retorno repetido o un timeout puede ocurrir después de autorizar.
      respuesta = await consultar('GET', token);
    }
    if (respuesta.buy_order !== propia.orden || respuesta.session_id !== propia.sesion) {
      throw new Error('La respuesta de Webpay no coincide con la transacción de Nicolett.');
    }

    const base = { id_reserva: propia.id_reserva, monto_esperado: MONTO };
    if (respuesta.status === 'AUTHORIZED' && respuesta.response_code === 0 &&
        Number.isSafeInteger(respuesta.amount) && respuesta.amount > 0) {
      return { ...base, resultado: 'APROBADO', definitivo: true,
        monto: respuesta.amount, referencia_transaccion: propia.orden };
    }
    if (respuesta.status === 'FAILED' && Number.isInteger(respuesta.response_code) &&
        respuesta.response_code !== 0) {
      return { ...base, resultado: 'RECHAZADO', definitivo: true };
    }
    return { ...base, resultado: 'PENDIENTE', definitivo: false };
  }

  function conectarReservas(reservas) {
    const crearWeb = reservas.crearWeb;
    reservas.crearWeb = async (...args) => {
      const reserva = await crearWeb(...args);
      try {
        const webpay = await iniciar(reserva.id_reserva);
        return { ...reserva, monto_abono: MONTO, webpay };
      } catch {
        try {
          await repository.conTransaccion(tx =>
            tx.reservas.eliminarPendienteSinPago(reserva.id_reserva));
        } catch {
          console.error('Webpay de prueba: la retención se liberará al vencer.');
        }
        throw errorInicio();
      }
    };
  }

  function crearRouter(servicios) {
    const router = Router();
    async function responderRetorno(req, res) {
      const campos = req.method === 'POST' ? req.body : req.query;
      let resultado = 'SIN_RESULTADO';
      let numero = '';
      try {
        if (tokenValido(campos?.token_ws) && !campos?.TBK_TOKEN &&
            await buscarTransaccion(campos.token_ws)) {
          const pago = await servicios.pagos.procesarResultadoWeb(campos.token_ws);
          resultado = pago.resultado;
          if (resultado === 'CONFIRMADA') {
            numero = String(pago.id_reserva);
            try {
              await calendario.sincronizar(pago.id_reserva);
            } catch {
              console.error('Google Calendar: sincronización pendiente para la reserva #' + numero);
            }
          }
        } else if (tokenValido(campos?.TBK_TOKEN) && await buscarTransaccion(campos.TBK_TOKEN)) {
          resultado = 'CANCELADO';
        }
      } catch {
        resultado = 'PENDIENTE';
        console.error('Webpay de prueba: no se pudo verificar o registrar el resultado.');
      }

      const mensaje = Object.hasOwn(MENSAJES, resultado)
        ? MENSAJES[resultado] : MENSAJES.SIN_RESULTADO;
      const detalle = /^\d+$/.test(numero) ? '<p>Reserva #' + numero + ' · $5.000 CLP simulados</p>' : '';
      return res.set({
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
      }).type('html').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Resultado del pago · Nicolett</title>
<style>
body{margin:0;background:#fbf7ef;color:#553b25;font:16px/1.6 system-ui,sans-serif}
main{max-width:34rem;margin:12vh auto;padding:2rem;border:1px solid #e6d8c4;background:#fffdf8}
h1{font:2rem Georgia,serif}a{color:#553b25}p{margin-bottom:1.25rem}
</style></head><body><main><p>NICOLETT STUDIO · AMBIENTE DE PRUEBA</p>
<h1>Resultado del abono</h1><p>${mensaje}</p>${detalle}
<a href="/">Volver a Nicolett</a></main></body></html>`);
    }

    router.get('/retorno', responderRetorno);
    router.post('/retorno', urlencoded({ extended: false, limit: '4kb' }), responderRetorno);
    return router;
  }

  return { verificarResultado, conectarReservas, crearRouter };
}

module.exports = crearWebpayPrueba;
