'use strict';
const { Router } = require('express');
function crearReservaRoutes(c) {
  const router = Router();
  router.post('/web', c.reservas.crearWeb); // Pública; sesión opcional, abono pendiente.
  router.post('/manual', c.reservas.crearManual); // Personal; abono opcional.
  // Query agenda: desde, hasta, rut_especialista e id_estado opcionales.
  router.get('/agenda', c.reservas.listarAgenda);
  router.get('/mis-reservas', c.reservas.listarMisReservas);
  router.get('/:id_reserva', c.reservas.buscarPorId);
  router.patch('/:id_reserva/cancelacion', c.reservas.cancelar);
  return router;
}
module.exports = crearReservaRoutes;
