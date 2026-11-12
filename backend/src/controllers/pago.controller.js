'use strict';

function crearPagoController(dependencias) {
  const { accion, bodyCampos, camposPagoManual, contexto, cuerpo, idParametro, paginacion, parametro, queryEntero, responder, servicios } = dependencias;
  const pagos = {
    // Params: id_reserva. Body: id_medio, monto, referencia_transaccion, recibido.
    registrarManual: accion(async (req, res) => responder(res,
      await servicios.pagos.registrarManual(contexto(req), idParametro(req, 'id_reserva'), bodyCampos(req, camposPagoManual)),
      200, 'Abono recibido registrado.')),
    listarMisComprobantes: accion(async (req, res) => responder(res,
      await servicios.pagos.listarMisComprobantes(contexto(req), paginacion(req)))),
    // Params: rut. Solo personal; los abonos antiguos NO son saldo automático.
    listarComprobantesCliente: accion(async (req, res) => responder(res,
      await servicios.pagos.listarComprobantesCliente(contexto(req), parametro(req, 'rut'), paginacion(req)))),
    // Query: limite. Solo Administrador. No borra pendientes por sí mismo.
    listarPendientesVencidas: accion(async (req, res) => responder(res,
      await servicios.pagos.listarPendientesVencidas(contexto(req), { limite: queryEntero(req, 'limite', 50) }))),
    // FUTURA integración. Body JSON: token. No aceptar resultado/monto del front.
    // El servicio verifica al proveedor mediante su adaptador (aún pendiente).
    procesarResultadoWeb: accion(async (req, res) => {
      const resultado = await servicios.pagos.procesarResultadoWeb(cuerpo(req).token);
      const pendiente = ['PENDIENTE', 'REQUIERE_REVISION'].includes(String(resultado.resultado).toUpperCase());
      // ok indica que se procesó la solicitud, NO que el pago fue aprobado.
      // Consultar datos.resultado: RECHAZADO, CANCELADO, CONFIRMADA, etc.
      return responder(res, resultado, pendiente ? 202 : 200);
    })
  };
  return pagos;
}
module.exports = crearPagoController;
