'use strict';

function crearAtencionRepository(dependencias) {
  const { bloquearReserva, paginacion, seleccionAtencion, uno, varios } = dependencias;
  const atenciones = {
    buscarPorId(id) { return uno(`${seleccionAtencion} WHERE a.id_atencion=$1`, [id]); },
    buscarPorReserva(idReserva) { return uno(`${seleccionAtencion} WHERE a.id_reserva=$1`, [idReserva]); },
    async crear({ id_reserva, servicio_realizado, detalle, observaciones = '' }) {
      if (!await bloquearReserva(id_reserva)) return null;
      return uno(`INSERT INTO atencion(id_reserva,servicio_realizado,detalle,observaciones)
        SELECT r.id_reserva,$2,$3,$4 FROM reserva r JOIN estado_reserva e USING(id_estado)
        WHERE r.id_reserva=$1 AND upper(e.nombre)='CONFIRMADA' RETURNING *`,
      [id_reserva, servicio_realizado, detalle, observaciones]);
    },
    // Coordinar crear() y marcarReservaRealizada() en UNA transacción.
    async marcarReservaRealizada(idReserva) {
      if (!await bloquearReserva(idReserva)) return null;
      return uno(`UPDATE reserva r SET id_estado=destino.id_estado,retencion_hasta=NULL
        FROM estado_reserva actual,estado_reserva destino WHERE r.id_reserva=$1
          AND actual.id_estado=r.id_estado AND upper(actual.nombre) IN ('CONFIRMADA','REALIZADA')
          AND upper(destino.nombre)='REALIZADA'
          AND EXISTS(SELECT 1 FROM atencion a WHERE a.id_reserva=r.id_reserva) RETURNING r.*`, [idReserva]);
    },
    listarHistorial(rut, { idEspecialidad = null, limite = 50, desplazamiento = 0 } = {}) {
      const [l, d] = paginacion(limite, desplazamiento);
      return varios(`${seleccionAtencion} WHERE r.rut_cliente=$1
        AND ($2::bigint IS NULL OR r.id_especialidad=$2)
        ORDER BY e.nombre,r.fecha_hora_inicio DESC,a.id_atencion DESC LIMIT $3 OFFSET $4`,
      [rut, idEspecialidad, l, d]);
    },
    listarEspecialidadesConHistorial(rut) {
      return varios(`SELECT DISTINCT e.id_especialidad,e.nombre FROM atencion a
        JOIN reserva r USING(id_reserva) JOIN especialidad e USING(id_especialidad)
        WHERE r.rut_cliente=$1 ORDER BY e.nombre`, [rut]);
    },
    buscarUltima(rut, idEspecialidad) {
      return uno(`${seleccionAtencion} WHERE r.rut_cliente=$1 AND r.id_especialidad=$2
        ORDER BY r.fecha_hora_inicio DESC,a.id_atencion DESC LIMIT 1`, [rut, idEspecialidad]);
    }
  };
  return atenciones;
}
module.exports = crearAtencionRepository;
