import * as repo from '../repositories/especialidad.repository.js';
import { idValido, fallo } from './validacion.js';
export const obtenerEspecialidades=()=>repo.listarEspecialidades();
export async function obtenerEspecialidadPorId(id) {
  const dato=await repo.buscarEspecialidadPorId(idValido(id));
  if (!dato) fallo('La especialidad no existe.',404);
  return dato;
}
