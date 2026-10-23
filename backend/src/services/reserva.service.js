import * as repo from '../repositories/reserva.repository.js';
import { datosReserva,idValido,fechaValida,fallo } from './validacion.js';
export const crear=datos=>repo.crear(datosReserva(datos));
export const listar=fecha=>repo.listar(fecha ? fechaValida(fecha) : null);
export const cancelar=id=>repo.cancelar(idValido(id));
export function pagar(id,body) {
 const monto=body?.monto;
 if (!Number.isSafeInteger(monto) || monto<=0 || monto>2147483647) fallo('Monto inválido: ingresa pesos enteros positivos.');
 return repo.pagar(idValido(id),monto);
}

export function crearConPagoSimulado(body) {
 if (typeof body?.operacion!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.operacion)) fallo('Identificador de operación inválido.');
 return repo.crear(datosReserva(body),body.operacion);
}
