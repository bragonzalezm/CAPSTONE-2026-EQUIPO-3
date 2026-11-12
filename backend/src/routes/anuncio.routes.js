'use strict';
const { Router } = require('express');
function crearAnuncioRoutes(c) {
  const router = Router();
  router.get('/', c.anuncios.listarPublicos);
  router.get('/gestion', c.anuncios.listarGestion);
  router.post('/', c.anuncios.crear);
  router.put('/:id_anuncio', c.anuncios.actualizar);
  router.delete('/:id_anuncio', c.anuncios.eliminar);
  return router;
}
module.exports = crearAnuncioRoutes;
