'use strict';
const { Router } = require('express');
function crearUsuarioRoutes(c) {
  const router = Router();
  // Rutas fijas antes de /:rut para que 'mi-perfil' no se interprete como RUT.
  router.get('/mi-perfil', c.usuarios.verMiPerfil);
  router.put('/mi-perfil', c.usuarios.actualizarMiPerfil);
  router.get('/', c.usuarios.listar); // Admin. Query: busqueda, limite, desplazamiento.
  router.get('/:rut', c.usuarios.verFicha); // Personal autorizado.
  router.put('/:rut', c.usuarios.actualizarDatos); // Admin.
  router.patch('/:rut/precauciones', c.usuarios.actualizarPrecauciones);
  return router;
}
module.exports = crearUsuarioRoutes;
