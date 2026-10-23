export function fallo(mensaje, status=400) { const error=new Error(mensaje); error.status=status; throw error; }
export function idValido(valor) {
  if (!/^\d+$/.test(String(valor))) fallo('ID inválido.');
  const id=Number(valor);
  if (!Number.isSafeInteger(id) || id<=0 || id>2147483647) fallo('ID inválido.');
  return id;
}
export function texto(valor, campo, max) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length>max) fallo(`${campo}: valor requerido (máximo ${max} caracteres).`);
  return valor.trim();
}
export function fechaValida(valor) {
  if (typeof valor!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) fallo('Fecha inválida.');
  const d=new Date(valor+'T12:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==valor) fallo('Fecha inválida.');
  return valor;
}
export function runValido(valor) {
  const run=texto(valor,'RUN',12).replace(/\./g,'').toUpperCase();
  if (!/^\d{7,8}-[0-9K]$/.test(run)) fallo('RUN inválido. Usa el formato 12345678-5.');
  const [numero,dv]=run.split('-'); let suma=0,m=2;
  for (const n of [...numero].reverse()) { suma+=Number(n)*m; m=m===7?2:m+1; }
  const r=11-suma%11; const esperado=r===11?'0':r===10?'K':String(r);
  if (dv!==esperado) fallo('El dígito verificador del RUN es incorrecto.');
  return run;
}
export function datosReserva(body) {
  if (!body || typeof body!=='object') fallo('Datos de reserva requeridos.');
  const correo=texto(body.correo_electronico,'Correo',100);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) fallo('Correo inválido.');
  const celular=texto(body.num_cel,'Celular',9);
  if (!/^9\d{8}$/.test(celular)) fallo('El celular debe tener 9 dígitos y comenzar con 9.');
  const inicio=texto(body.fecha_inicio,'Fecha de inicio',19).replace('T',' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$/.test(inicio)) fallo('Horario inválido.');
  fechaValida(inicio.slice(0,10));
  if (Number(inicio.slice(11,13))>23 || Number(inicio.slice(14,16))>59) fallo('Horario inválido.');
  const notas=body.indicaciones_especiales ?? '';
  if (typeof notas!=='string' || notas.length>1000) fallo('Indicaciones: máximo 1000 caracteres.');
  return {run:runValido(body.run),nombre:texto(body.nombre,'Nombre',100),apellido:texto(body.apellido,'Apellido',100),
    num_cel:celular,correo_electronico:correo,id_especialista:idValido(body.id_especialista),
    id_especialidad:idValido(body.id_especialidad),fecha_inicio:inicio,indicaciones_especiales:notas.trim()};
}
