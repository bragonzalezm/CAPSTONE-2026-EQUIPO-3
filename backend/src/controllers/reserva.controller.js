import * as service from '../services/reserva.service.js';
export async function crear(req,res,next) {
 try { res.status(201).json(await service.crear(req.body)); } catch(error) { next(error); }
}
export async function listar(req,res,next) {
 try { res.status(200).json(await service.listar(req.query.fecha)); } catch(error) { next(error); }
}
export async function cancelar(req,res,next) {
 try { res.status(200).json(await service.cancelar(req.params.id)); } catch(error) { next(error); }
}
export async function pagar(req,res,next) {
 try { res.status(201).json(await service.pagar(req.params.id,req.body)); } catch(error) { next(error); }
}

export async function crearConPagoSimulado(req,res,next) {
 try {res.status(201).json(await service.crearConPagoSimulado(req.body));} catch(error) {next(error);}
}
