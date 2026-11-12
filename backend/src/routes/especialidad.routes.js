'use strict';
const { Router } = require('express');
function crearEspecialidadRoutes(c) {
  const router = Router();
  router.get('/', c.especialidades.listarPublicas);
  router.get('/gestion', c.especialidades.listarGestion);
  router.post('/usuarios/:rut', c.especialidades.asignar); // Body: id_especialidad.
  router.delete('/usuarios/:rut/:id_especialidad', c.especialidades.retirarAsignacion);
  router.get('/:id_especialidad/especialistas', c.especialidades.listarEspecialistas); // Pública.
  router.post('/', c.especialidades.crear);
  router.put('/:id_especialidad', c.especialidades.actualizar);
  return router;
}
module.exports = crearEspecialidadRoutes;
