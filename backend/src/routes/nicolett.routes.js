const crearAuthRoutes = require('./auth.routes');
const crearUsuarioRoutes = require('./usuario.routes');
const crearRolRoutes = require('./rol.routes');
const crearEspecialidadRoutes = require('./especialidad.routes');
const crearCatalogoRoutes = require('./catalogo.routes');
const crearAnuncioRoutes = require('./anuncio.routes');
const crearHorarioRoutes = require('./horario.routes');
const crearReservaRoutes = require('./reserva.routes');
const crearPagoRoutes = require('./pago.routes');
const crearAtencionRoutes = require('./atencion.routes');
'use strict';



const { Router } = require('express');

// ============================================================================
// 01. AUTENTICACIÓN -> auth.routes.js | prefijo /auth
// ============================================================================


// ============================================================================
// 02. USUARIOS -> usuario.routes.js | prefijo /usuarios
// ============================================================================


// ============================================================================
// 03. ROLES -> rol.routes.js | prefijo /roles
// ============================================================================


// ============================================================================
// 04. ESPECIALIDADES -> especialidad.routes.js | prefijo /especialidades
// ============================================================================


// ============================================================================
// 05. CATÁLOGO -> catalogo.routes.js | prefijo /catalogo
// ============================================================================


// ============================================================================
// 06. ANUNCIOS -> anuncio.routes.js | prefijo /anuncios
// ============================================================================


// ============================================================================
// 07. HORARIOS -> horario.routes.js | prefijo /horarios
// ============================================================================


// ============================================================================
// 08. RESERVAS -> reserva.routes.js | prefijo /reservas
// ============================================================================


// ============================================================================
// 09. PAGOS -> pago.routes.js | prefijo /pagos
// ============================================================================


// ============================================================================
// 10. ATENCIONES -> atencion.routes.js | prefijo /atenciones
// ============================================================================


// ============================================================================
// 11. ROUTER PRINCIPAL -> nicolett.routes.js (o index.js cuando lo separes)
// ============================================================================
function crearNicolettRoutes(controllers) {
  const router = Router();
  router.use('/auth', crearAuthRoutes(controllers));
  router.use('/usuarios', crearUsuarioRoutes(controllers));
  router.use('/roles', crearRolRoutes(controllers));
  router.use('/especialidades', crearEspecialidadRoutes(controllers));
  router.use('/catalogo', crearCatalogoRoutes(controllers));
  router.use('/anuncios', crearAnuncioRoutes(controllers));
  router.use('/horarios', crearHorarioRoutes(controllers));
  router.use('/reservas', crearReservaRoutes(controllers));
  router.use('/pagos', crearPagoRoutes(controllers));
  router.use('/atenciones', crearAtencionRoutes(controllers));

  // Solo cubre las solicitudes que llegan a este router (/api en el ejemplo).
  // También devuelve 404 si el método HTTP no tiene ruta definida.
  router.use((req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(404).json({
      ok: false,
      error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta solicitada no existe.' }
    });
  });
  // manejarError permanece en app.js para capturar también errores de parsers.
  return router;
}

module.exports = crearNicolettRoutes;
