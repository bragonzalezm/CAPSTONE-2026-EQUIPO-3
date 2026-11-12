'use strict';
const { Router } = require('express');
function crearPagoRoutes(c) {
  const router = Router();
  router.get('/mis-comprobantes', c.pagos.listarMisComprobantes);
  router.get('/clientes/:rut/comprobantes', c.pagos.listarComprobantesCliente);
  router.get('/pendientes-vencidas', c.pagos.listarPendientesVencidas); // Admin; solo consulta.
  router.post('/reservas/:id_reserva/manual', c.pagos.registrarManual);
  // procesarResultadoWeb queda sin ruta hasta implementar la integración real.
  return router;
}
module.exports = crearPagoRoutes;
