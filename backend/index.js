import app from './src/app.js';
import pool from './src/config/db.js';
const port=Number(process.env.PORT ?? 3000);
try {
 await pool.query('SELECT 1');
 const server=app.listen(port,'127.0.0.1',()=>console.log(`Nicolett Studio: http://localhost:${port}`));
 server.on('error',async error=>{console.error(error.message);await pool.end();process.exitCode=1;});
 for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0);}));
} catch(error) {console.error('No se pudo conectar a PostgreSQL:',error.message);await pool.end();process.exitCode=1;}
