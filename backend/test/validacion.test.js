import test from 'node:test';
import assert from 'node:assert/strict';
import {idValido,fechaValida,runValido,datosReserva} from '../src/services/validacion.js';
test('IDs válidos y rechazo de valores no enteros',()=>{assert.equal(idValido('12'),12);for(const v of ['abc',0,-1,1.1,null,'',2147483648])assert.throws(()=>idValido(v));});
test('Fecha calendario real',()=>{assert.equal(fechaValida('2028-02-29'),'2028-02-29');for(const d of ['2027-02-29','2026-02-30','no'])assert.throws(()=>fechaValida(d));});
test('RUN y dígito verificador',()=>{assert.equal(runValido('12.345.678-5'),'12345678-5');assert.throws(()=>runValido('12345678-9'));});
const datos={run:'12345678-5',nombre:'Demo',apellido:'Prueba',num_cel:'912345678',correo_electronico:'demo@example.com',id_especialista:1,id_especialidad:1,fecha_inicio:'2027-01-04 10:00:00'};
test('Normaliza reserva y rechaza campos inválidos',()=>{assert.equal(datosReserva(datos).indicaciones_especiales,'');for(const patch of [{num_cel:'123'},{correo_electronico:'mal'},{fecha_inicio:'2027-01-04 25:00:00'},{nombre:' '},{indicaciones_especiales:42}])assert.throws(()=>datosReserva({...datos,...patch}));});
