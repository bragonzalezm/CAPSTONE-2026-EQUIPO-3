'use strict';
const { Router } = require('express');
function crearAuthRoutes(c) {
  const router = Router();
  router.post('/registro', c.auth.registrarCuenta); // Pública; no inicia sesión.
  router.post('/login', c.auth.iniciarSesion);      // Pública; crea sesión.
  router.post('/logout', c.auth.cerrarSesion);
  router.patch('/password', c.auth.cambiarPassword); // Sesión requerida.
  router.post('/usuarios/:rut/habilitar-cuenta', c.auth.habilitarCuentaExistente); // Admin.
  return router;
}
module.exports = crearAuthRoutes;
