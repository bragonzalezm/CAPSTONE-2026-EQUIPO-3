'use strict';

const path = require('node:path');


const express = require('express');
const session = require('express-session');

const pool = require('./config/db');
const crearNicolettService = require('./services/nicolett.service');
const crearNicolettController = require('./controllers/nicolett.controller');
const crearNicolettRoutes = require('./routes/nicolett.routes');

const app = express();

if (!process.env.SESSION_SECRET) {
  throw new Error('Falta SESSION_SECRET en backend/.env');
}

// 01. Configuración general
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// 02. Sesiones para desarrollo local
app.use(session({
  name: 'nicolett.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Desarrollo local mediante HTTP.
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// 03. Conectar las capas
// El service crea internamente el repository usando este mismo pool.
const servicios = crearNicolettService(pool);

const controllers = crearNicolettController(servicios, {
  nombreCookieSesion: 'nicolett.sid',
  pathCookieSesion: '/'
});

const routes = crearNicolettRoutes(controllers);

// 04. Rutas del backend
app.use('/api', routes);

// 05. Servir la carpeta frontend existente
app.use(express.static(
  path.resolve(__dirname, '../../frontend')
));

// 06. Rutas no encontradas fuera de /api
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      codigo: 'RUTA_NO_ENCONTRADA',
      mensaje: 'La ruta solicitada no existe.'
    }
  });
});

// 07. Manejo de errores: siempre al final
app.use(controllers.manejarError);

module.exports = app;