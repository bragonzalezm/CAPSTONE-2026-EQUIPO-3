'use strict';

function crearHorarioRepository(dependencias) {
  const { bloquearEspecialista, exigirTransaccion, uno, varios } = dependencias;
  const horarios = {
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
        )) AS disponible FROM bloques b ORDER BY inicio`, [rutEspecialista, desde, hasta]);
    }
  };
  return horarios;
}
module.exports = crearHorarioRepository;
