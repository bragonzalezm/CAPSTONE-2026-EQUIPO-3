import * as repo from '../repositories/especialista.repository.js';
import { idValido, fechaValida } from './validacion.js';
export const listar=(especialidad)=>repo.listar(idValido(especialidad));
export const horarios=(id,fecha)=>repo.horarios(idValido(id),fechaValida(fecha));
