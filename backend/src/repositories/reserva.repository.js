'use strict';

function crearReservaRepository(dependencias) {
  const { bloquearEspecialista, bloquearReserva, errorRepositorio, insertarReserva, paginacion, seleccionReserva, uno, varios } = dependencias;
  const reservas = {
    bloquearEspecialista,
    bloquearPorId: bloquearReserva,
    buscarPorId(id) { return uno(`${seleccionReserva} WHERE r.id_reserva=$1`, [id]); },
    listarAgenda({ desde, hasta, rutEspecialista = null, idEstado = null }) {
      // Intervalo de consulta [desde,hasta), ambos timestamps con zona.
      return varios(`${seleccionReserva} WHERE r.fecha_hora_inicio<$2 AND r.fecha_hora_fin>$1
        AND ($3::varchar IS NULL OR r.rut_especialista=$3)
        AND ($4::smallint IS NULL OR r.id_estado=$4) ORDER BY r.fecha_hora_inicio,r.id_reserva`,
      [desde, hasta, rutEspecialista, idEstado]);
    },
    listarPorCliente(rut, { limite = 50, desplazamiento = 0 } = {}) {
      const [l, d] = paginacion(limite, desplazamiento);
      return varios(`${seleccionReserva} WHERE r.rut_cliente=$1
        AND upper(er.nombre)<>'PENDIENTE' ORDER BY r.fecha_hora_inicio DESC,r.id_reserva DESC
        LIMIT $2 OFFSET $3`, [rut, l, d]);
    },
    buscarSolapamientos({ rutEspecialista, inicio, fin, excluirId = null }) {
      return varios(`SELECT r.* FROM reserva r JOIN estado_reserva er USING(id_estado)
        WHERE r.rut_especialista=$1 AND r.fecha_hora_inicio<$3 AND r.fecha_hora_fin>$2
          AND ($4::bigint IS NULL OR r.id_reserva<>$4)
          AND (upper(er.nombre) IN ('CONFIRMADA','REALIZADA')
            OR (upper(er.nombre)='PENDIENTE' AND (r.retencion_hasta IS NULL
              OR r.retencion_hasta>now() OR EXISTS(SELECT 1 FROM pago p WHERE p.id_reserva=r.id_reserva))))
        ORDER BY r.fecha_hora_inicio`, [rutEspecialista, inicio, fin, excluirId]);
    },
    crearPendienteWeb(datos) {
      if (!datos.retencion_hasta) throw new Error('Una retención web requiere retencion_hasta.');
      return insertarReserva(datos, 'WEB', 'PENDIENTE');
    },
    crearManual(datos) {
      return insertarReserva({ ...datos, retencion_hasta: null }, 'PERSONAL', 'CONFIRMADA');
    },
    async confirmarWebPagada(id) {
      const r = await bloquearReserva(id);
      if (!r) return null;
      const cruces = await reservas.buscarSolapamientos({ rutEspecialista: r.rut_especialista,
        inicio: r.fecha_hora_inicio, fin: r.fecha_hora_fin, excluirId: id });
      if (cruces.length) throw errorRepositorio('HORARIO_OCUPADO', 'No se puede confirmar: intervalo ocupado.');
      return uno(`UPDATE reserva r SET id_estado=destino.id_estado,retencion_hasta=NULL
        FROM estado_reserva destino,estado_reserva actual,origen_reserva ori
        WHERE r.id_reserva=$1 AND actual.id_estado=r.id_estado AND ori.id_origen=r.id_origen
          AND upper(destino.nombre)='CONFIRMADA' AND upper(ori.nombre)='WEB'
          AND upper(actual.nombre) IN ('PENDIENTE','CONFIRMADA')
          AND EXISTS(SELECT 1 FROM pago p JOIN medio_pago m USING(id_medio)
            WHERE p.id_reserva=r.id_reserva AND upper(m.nombre)='WEBPAY') RETURNING r.*`, [id]);
    },
    async cancelar(id) {
      if (!await bloquearReserva(id)) return null;
      // Un segundo intento de cancelación devuelve la fila ya cancelada.
      // No borra el pago ni cambia las fechas; no permite cancelar atenciones.
      return uno(`UPDATE reserva r SET id_estado=destino.id_estado,retencion_hasta=NULL
        FROM estado_reserva actual,estado_reserva destino
        WHERE r.id_reserva=$1 AND r.id_estado=actual.id_estado
          AND upper(destino.nombre)='CANCELADA'
          AND (upper(actual.nombre)='CANCELADA' OR
            (upper(actual.nombre)='CONFIRMADA' AND r.fecha_hora_inicio>now()))
          AND NOT EXISTS(SELECT 1 FROM atencion a WHERE a.id_reserva=r.id_reserva) RETURNING r.*`, [id]);
    },
    listarPendientesVencidas({ limite = 50 } = {}) {
      const [l] = paginacion(limite);
      return varios(`SELECT r.* FROM reserva r JOIN estado_reserva e USING(id_estado)
        WHERE upper(e.nombre)='PENDIENTE' AND r.retencion_hasta<=now()
          AND NOT EXISTS(SELECT 1 FROM pago p WHERE p.id_reserva=r.id_reserva)
        ORDER BY r.retencion_hasta,r.id_reserva LIMIT $1`, [l]);
    },
    async eliminarPendienteSinPago(id) {
      if (!await bloquearReserva(id)) return null;
      return uno(`DELETE FROM reserva r USING estado_reserva e
        WHERE r.id_reserva=$1 AND r.id_estado=e.id_estado AND upper(e.nombre)='PENDIENTE'
          AND NOT EXISTS(SELECT 1 FROM pago p WHERE p.id_reserva=r.id_reserva)
          AND NOT EXISTS(SELECT 1 FROM atencion a WHERE a.id_reserva=r.id_reserva)
        RETURNING r.id_reserva`, [id]);
    },
    async actualizarEventoGoogle(id, idEvento) {
      if (!await bloquearReserva(id)) return null;
      return uno('UPDATE reserva SET id_evento_google=$2 WHERE id_reserva=$1 RETURNING *', [id, idEvento]);
    }
  };
  return reservas;
}
module.exports = crearReservaRepository;
