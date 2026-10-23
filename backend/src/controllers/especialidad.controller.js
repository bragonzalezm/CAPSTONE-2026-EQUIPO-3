import * as service from '../services/especialidad.service.js';
export async function listarEspecialidades(req,res,next) {
 try { res.status(200).json(await service.obtenerEspecialidades()); } catch(error) { next(error); }
}
export async function buscarEspecialidadPorId(req,res,next) {
 try { res.status(200).json(await service.obtenerEspecialidadPorId(req.params.id)); } catch(error) { next(error); }
}
