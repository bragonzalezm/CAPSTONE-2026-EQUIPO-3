'use strict';
const { Router } = require('express');
function crearAtencionRoutes(c) {
  const router = Router();
  router.get('/base-anterior', c.atenciones.obtenerBaseAnterior);
  router.get('/clientes/:rut/historial', c.atenciones.listarHistorial);
  router.get('/clientes/:rut/especialidades', c.atenciones.listarEspecialidadesConHistorial);
  router.post('/', c.atenciones.registrar);
  router.get('/:id_atencion', c.atenciones.ver);
  return router;
}
module.exports = crearAtencionRoutes;
