'use strict';

const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});

const app = require('./src/app');
const pool = require('./src/config/db');

const port = Number(process.env.PORT || 3000);

async function iniciarServidor() {
  try {
    // Verificar conexión antes de encender el servidor.
    await pool.query('SELECT 1');
    console.log('Conexión a PostgreSQL correcta.');
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL:', error.message);
    await pool.end();
    process.exitCode = 1;
    return;
  }

  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Nicolett Studio: http://localhost:${port}`);
  });

  server.on('error', async (error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    await pool.end();
    process.exitCode = 1;
  });

  // Cerrar el servidor y las conexiones al detener la aplicación.
  let cerrando = false;

  function cerrarServidor() {
    if (cerrando) return;
    cerrando = true;

    console.log('\nCerrando servidor...');

    server.close(async (error) => {
      try {
        await pool.end();
        process.exitCode = error ? 1 : 0;
      } catch (errorCierre) {
        console.error('Error al cerrar PostgreSQL:', errorCierre.message);
        process.exitCode = 1;
      }
    });
  }

  process.on('SIGINT', cerrarServidor);
  process.on('SIGTERM', cerrarServidor);
}

iniciarServidor().catch((error) => {
  console.error('Error al iniciar la aplicación:', error.message);
  process.exitCode = 1;
});