import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import especialidades from './routes/especialidad.routes.js';
import especialistas from './routes/especialista.routes.js';
import reservas from './routes/reserva.routes.js';
const app=express();
app.disable('x-powered-by');
app.use(cors({origin:['http://localhost:5500','http://127.0.0.1:5500']}));
app.use(express.json({limit:'20kb'}));
app.use('/api/especialidades',especialidades);
app.use('/api/especialistas',especialistas);
app.use('/api/reservas',reservas);
// Carpetas separadas; el backend entrega el frontend sin herramientas adicionales.
app.use(express.static(fileURLToPath(new URL('../../frontend/',import.meta.url))));
app.use((req,res)=>res.status(404).json({mensaje:'Ruta no encontrada.'}));
app.use((error,req,res,next)=>{
 const status=error.status ?? 500;
 if (status>=500) console.error(error);
 res.status(status).json({mensaje:status>=500?'Error interno del servidor.':error.message});
});
export default app;
