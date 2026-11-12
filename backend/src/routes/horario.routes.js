'use strict';
const { Router } = require('express');
function crearHorarioRoutes(c) {
  const router = Router();
  router.get('/calendario',c.horarios.calendario);
  router.post('/predeterminados',c.horarios.aplicarPredeterminados);
  router.post('/bloqueos',c.horarios.bloquearFecha);
  router.delete('/bloqueos/:rut_especialista/:id_bloqueo',c.horarios.desbloquearFecha);
  // Pública. Query: rut_especialista, id_especialidad, desde, hasta (YYYY-MM-DD).
  router.get('/disponibilidad', c.horarios.consultarDisponibilidad);
  // Gestión: especialista para agenda propia o Administrador, comprobado en servicio.
  router.get('/especialistas/:rut_especialista', c.horarios.listarGestion);
  router.post('/', c.horarios.crear); // rut_especialista en body, junto con el bloque.
  router.put('/especialistas/:rut_especialista/:id_horario', c.horarios.actualizar);
  router.delete('/especialistas/:rut_especialista/:id_horario', c.horarios.eliminar);
  return router;
}
module.exports = crearHorarioRoutes;
