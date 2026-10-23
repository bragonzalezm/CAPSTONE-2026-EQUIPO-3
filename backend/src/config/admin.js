import { timingSafeEqual } from 'node:crypto';
export function admin(req,res,next) {
 const esperado=process.env.ADMIN_KEY;
 if (!esperado || esperado==='cambia-esta-clave-por-una-propia') return res.status(503).json({mensaje:'Configura ADMIN_KEY en el .env y reinicia el servidor.'});
 const recibido=Buffer.from(req.get('authorization') ?? '');
 const correcto=Buffer.from(`Bearer ${esperado}`);
 if (recibido.length!==correcto.length || !timingSafeEqual(recibido,correcto)) return res.status(401).json({mensaje:'Clave de administración incorrecta.'});
 next();
}
