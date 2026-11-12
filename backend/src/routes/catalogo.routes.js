'use strict';
const { Router } = require('express');
function crearCatalogoRoutes(c) {
  const router = Router();
  router.get('/parametros/:nombre', c.catalogo.listarParametros); // Lista permitida por servicio.
  router.get('/servicios', c.catalogo.listarServicios); // Pública. Query: id_especialidad.
  router.get('/servicios/gestion', c.catalogo.listarGestion);
  router.post('/servicios', c.catalogo.crearServicio);
  router.put('/servicios/:id_servicio', c.catalogo.actualizarServicio);
  router.patch('/servicios/:id_servicio/activo', c.catalogo.cambiarActivo);
  return router;
}
module.exports = crearCatalogoRoutes;
