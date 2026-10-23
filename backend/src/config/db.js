import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
// Las citas son horas locales del estudio (America/Santiago), sin conversión a UTC.
pg.types.setTypeParser(1114, value => value);
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});
pool.on('error', error => console.error('Error de conexión PostgreSQL:', error.message));
export default pool;
