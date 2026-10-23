import * as service from '../services/especialista.service.js';
export async function listar(req,res,next) {
 try { res.status(200).json(await service.listar(req.query.especialidad)); } catch(error) { next(error); }
}
export async function horarios(req,res,next) {
 try { res.status(200).json(await service.horarios(req.params.id,req.query.fecha)); } catch(error) { next(error); }
}
