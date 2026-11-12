'use strict';
const { Router } = require('express');
function crearRolRoutes(c) {
  const router = Router();
  // Todas requieren Administrador. Asignar recibe { id_rol } en body.
  router.get('/usuarios/:rut', c.roles.listarPorUsuario);
  router.post('/usuarios/:rut', c.roles.asignar);
  router.delete('/usuarios/:rut/:id_rol', c.roles.retirar);
  return router;
}
module.exports = crearRolRoutes;
