'use strict';

function crearHorarioRepository(dependencias) {
  const { bloquearEspecialista, exigirTransaccion, uno, varios } = dependencias;
  const horarios = {
    borrarSemanales(rut) { exigirTransaccion(); return varios('DELETE FROM horario_trabajo WHERE rut_especialista=$1 RETURNING *',[rut]); },
    listarBloqueos(rut,desde,hasta) { return varios(`SELECT id_bloqueo,rut_especialista,to_char(fecha,'YYYY-MM-DD') AS fecha,hora_inicio,hora_fin,motivo FROM bloqueo_horario WHERE rut_especialista=$1 AND fecha BETWEEN $2::date AND $3::date ORDER BY fecha,hora_inicio`,[rut,desde,hasta]); },
    crearBloqueo(rut,d) { exigirTransaccion(); return uno(`INSERT INTO bloqueo_horario(rut_especialista,fecha,hora_inicio,hora_fin,motivo) VALUES($1,$2,$3,$4,$5) RETURNING id_bloqueo`,[rut,d.fecha,d.hora_inicio,d.hora_fin,d.motivo]); },
    eliminarBloqueo(rut,id) { exigirTransaccion(); return uno('DELETE FROM bloqueo_horario WHERE rut_especialista=$1 AND id_bloqueo=$2 RETURNING id_bloqueo',[rut,id]); },
    limitesLocales(desde,hasta) { return uno(`SELECT $1::date::timestamp AT TIME ZONE 'America/Santiago' AS inicio, ($2::date+1)::timestamp AT TIME ZONE 'America/Santiago' AS fin`,[desde,hasta]); },
    intervaloLocal(fecha,inicio,fin) { return uno(`SELECT ($1::date+$2::time) AT TIME ZONE 'America/Santiago' AS inicio, ($1::date+$3::time) AT TIME ZONE 'America/Santiago' AS fin`,[fecha,inicio,fin]); },
    listarPorEspecialista(rut) {
      return varios(`SELECT h.*,d.nombre AS dia FROM horario_trabajo h JOIN dia_semana d USING(id_dia)
        WHERE rut_especialista=$1 ORDER BY id_dia,hora_inicio`, [rut]);
    },
    async crear({ rut_especialista, id_dia, hora_inicio, hora_fin }) {
      await bloquearEspecialista(rut_especialista);
      return uno(`INSERT INTO horario_trabajo(rut_especialista,id_dia,hora_inicio,hora_fin)
        VALUES($1,$2,$3,$4) RETURNING *`, [rut_especialista, id_dia, hora_inicio, hora_fin]);
    },
    async actualizar(id, { id_dia, hora_inicio, hora_fin }) {
      exigirTransaccion();
      const h = await uno('SELECT rut_especialista FROM horario_trabajo WHERE id_horario=$1', [id]);
      if (!h) return null;
      await bloquearEspecialista(h.rut_especialista);
      return uno(`UPDATE horario_trabajo SET id_dia=$2,hora_inicio=$3,hora_fin=$4
        WHERE id_horario=$1 RETURNING *`, [id, id_dia, hora_inicio, hora_fin]);
    },
    async eliminar(id) {
      exigirTransaccion();
      const h = await uno('SELECT rut_especialista FROM horario_trabajo WHERE id_horario=$1', [id]);
      if (!h) return null;
      await bloquearEspecialista(h.rut_especialista);
      return uno('DELETE FROM horario_trabajo WHERE id_horario=$1 RETURNING *', [id]);
    },
    // Cada fila semanal representa UN bloque ofrecido, no una jornada que se
    // subdivide automáticamente. desde/hasta son fechas locales inclusivas.
    // Usar rangos acotados desde el servicio (por ejemplo, una semana).
    listarBloques({ rutEspecialista, desde, hasta }) {
      return varios(`WITH fechas AS (
          SELECT $2::date + n AS dia FROM generate_series(0,$3::date-$2::date) n
        ), bloques AS (
          SELECT h.id_horario,h.rut_especialista,
            (f.dia+h.hora_inicio) AT TIME ZONE 'America/Santiago' AS inicio,
            (f.dia+h.hora_fin) AT TIME ZONE 'America/Santiago' AS fin
          FROM fechas f JOIN horario_trabajo h
            ON h.id_dia=extract(isodow FROM f.dia)::smallint
          WHERE h.rut_especialista=$1
        ) SELECT b.*, (b.inicio>now() AND NOT EXISTS (
          SELECT 1 FROM reserva r JOIN estado_reserva er USING(id_estado)
          WHERE r.rut_especialista=b.rut_especialista
            AND r.fecha_hora_inicio<b.fin AND r.fecha_hora_fin>b.inicio
            AND (upper(er.nombre) IN ('CONFIRMADA','REALIZADA')
              OR (upper(er.nombre)='PENDIENTE' AND (
                r.retencion_hasta IS NULL OR r.retencion_hasta>now()
                OR EXISTS(SELECT 1 FROM pago p WHERE p.id_reserva=r.id_reserva))))
         ) AND NOT EXISTS(SELECT 1 FROM bloqueo_horario x WHERE x.rut_especialista=b.rut_especialista
          AND (x.fecha+x.hora_inicio) AT TIME ZONE 'America/Santiago'<b.fin
          AND (x.fecha+x.hora_fin) AT TIME ZONE 'America/Santiago'>b.inicio)
        ) AS disponible,
        EXISTS(SELECT 1 FROM bloqueo_horario x WHERE x.rut_especialista=b.rut_especialista
          AND (x.fecha+x.hora_inicio) AT TIME ZONE 'America/Santiago'<b.fin
          AND (x.fecha+x.hora_fin) AT TIME ZONE 'America/Santiago'>b.inicio) AS bloqueado
        FROM bloques b ORDER BY inicio`, [rutEspecialista, desde, hasta]);
    }
  };
  return horarios;
}
module.exports = crearHorarioRepository;
