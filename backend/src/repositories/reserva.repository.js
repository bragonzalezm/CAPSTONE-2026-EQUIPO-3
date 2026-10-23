import pool from '../config/db.js';
import { horarios } from './especialista.repository.js';
import { fallo } from '../services/validacion.js';
export async function crear(datos,operacion=null) {
 const db=await pool.connect();
 try {
  await db.query('BEGIN');
  if (operacion) {
   await db.query('SELECT pg_advisory_xact_lock(7402, hashtext($1))',[operacion]);
   const previo=await db.query(`SELECT r.id,r.fecha_inicio,r.fecha_fin,r.estado,p.monto,p.estado AS estado_pago
    FROM "PAGO" p JOIN "RESERVA" r ON r.id=p.id_reserva WHERE p.orden_compra=$1`,['DEMO-'+operacion]);
   if (previo.rowCount) {await db.query('COMMIT');return previo.rows[0];}
  }
  // Serializa las reservas del mismo especialista para evitar doble asignación.
  await db.query('SELECT pg_advisory_xact_lock(7401, $1::int)',[datos.id_especialista]);
  const relacion=await db.query('SELECT 1 FROM "ESPECIALISTA_ESPECIALIDAD" WHERE id_especialista=$1 AND id_especialidad=$2',[datos.id_especialista,datos.id_especialidad]);
  if (!relacion.rowCount) fallo('El especialista no realiza esta especialidad.');
  const libres=await horarios(datos.id_especialista,datos.fecha_inicio.slice(0,10),db);
  if (!libres.some(h=>h.fecha_inicio===datos.fecha_inicio)) fallo('El horario ya no está disponible. Selecciona otro.',409);
  const valores=[datos.run,datos.nombre,datos.apellido,datos.num_cel,datos.correo_electronico,datos.id_especialista,datos.id_especialidad,datos.fecha_inicio,datos.indicaciones_especiales];
  const resultado=await db.query(`INSERT INTO "RESERVA"
  (run,nombre,apellido,num_cel,correo_electronico,id_especialista,id_especialidad,fecha_inicio,fecha_fin,indicaciones_especiales,estado)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamp,$8::timestamp+interval '60 minutes',$9,'confirmada')
  RETURNING id,fecha_inicio,fecha_fin,estado`,valores);
  if (operacion) {
   await db.query(`INSERT INTO "PAGO" (id_reserva,monto,estado,orden_compra,fecha_pago)
    VALUES ($1,5000,'simulado',$2,CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')`,[resultado.rows[0].id,'DEMO-'+operacion]);
   resultado.rows[0].monto=5000;resultado.rows[0].estado_pago='simulado';
  }
  await db.query('COMMIT'); return resultado.rows[0];
 } catch(error) { await db.query('ROLLBACK'); throw error; }
 finally { db.release(); }
}
export async function listar(fecha) {
 return (await pool.query(`SELECT r.*,s.nombre AS especialidad,e.nombres||' '||COALESCE(e.ap_paterno,'') AS especialista,
 EXISTS(SELECT 1 FROM "PAGO" p WHERE p.id_reserva=r.id AND p.estado='pagado') AS pagada,
 EXISTS(SELECT 1 FROM "PAGO" p WHERE p.id_reserva=r.id AND p.estado='simulado') AS pago_simulado
 FROM "RESERVA" r JOIN "ESPECIALIDAD" s ON s.id=r.id_especialidad JOIN "ESPECIALISTA" e ON e.id=r.id_especialista
 WHERE ($1::date IS NULL OR r.fecha_inicio::date=$1::date) ORDER BY r.fecha_inicio DESC LIMIT 500`,[fecha ?? null])).rows;
}
export async function cancelar(id) {
 const db=await pool.connect();
 try {
  await db.query('BEGIN');
  const r=(await db.query('SELECT * FROM "RESERVA" WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if (!r) fallo('Reserva no encontrada.',404);
  const pago=await db.query(`SELECT 1 FROM "PAGO" WHERE id_reserva=$1 AND estado='pagado'`,[id]);
  if (pago.rowCount) fallo('Esta reserva tiene un pago registrado. La demo no gestiona devoluciones.',409);
  const resultado=await db.query(`UPDATE "RESERVA" SET estado='cancelada' WHERE id=$1 RETURNING id,estado`,[id]);
  await db.query('COMMIT'); return resultado.rows[0];
 } catch(error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
export async function pagar(id,monto) {
 const db=await pool.connect();
 try {
  await db.query('BEGIN');
  const r=(await db.query('SELECT * FROM "RESERVA" WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if (!r) fallo('Reserva no encontrada.',404);
  if (r.estado==='cancelada') fallo('La reserva está cancelada.',409);
  if ((await db.query(`SELECT 1 FROM "PAGO" WHERE id_reserva=$1 AND estado='pagado'`,[id])).rowCount) fallo('El pago ya está registrado.',409);
  const pago=await db.query(`INSERT INTO "PAGO" (id_reserva,monto,estado,orden_compra,fecha_pago)
  VALUES ($1::int,$2,'pagado','MANUAL-'||($1::int)::text,CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago') RETURNING *`,[id,monto]);
  await db.query('COMMIT'); return pago.rows[0];
 } catch(error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
