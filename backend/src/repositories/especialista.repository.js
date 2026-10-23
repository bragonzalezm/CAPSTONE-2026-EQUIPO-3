import pool from '../config/db.js';
export async function listar(especialidad) {
 return (await pool.query(`SELECT e.id,e.nombres,e.ap_paterno,e.ap_materno
 FROM "ESPECIALISTA" e JOIN "ESPECIALISTA_ESPECIALIDAD" ee ON ee.id_especialista=e.id
 WHERE ee.id_especialidad=$1 ORDER BY e.nombres`,[especialidad])).rows;
}
export async function horarios(id,fecha,db=pool) {
 return (await db.query(`SELECT DISTINCT to_char(s.inicio,'YYYY-MM-DD HH24:MI:SS') AS fecha_inicio,
 to_char(s.inicio+interval '60 minutes','YYYY-MM-DD HH24:MI:SS') AS fecha_fin
 FROM "DISPONIBILIDAD" d CROSS JOIN LATERAL generate_series(
 $2::date+d.hora_inicio, $2::date+d.hora_fin-interval '60 minutes',interval '60 minutes') s(inicio)
 WHERE d.id_especialista=$1 AND d.dia_semana=EXTRACT(DOW FROM $2::date)
 AND s.inicio > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')
 AND $2::date <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date+90
 AND NOT EXISTS (SELECT 1 FROM "RESERVA" r WHERE r.id_especialista=$1 AND r.estado<>'cancelada'
 AND r.fecha_inicio<s.inicio+interval '60 minutes' AND r.fecha_fin>s.inicio)
 ORDER BY fecha_inicio`,[id,fecha])).rows;
}
