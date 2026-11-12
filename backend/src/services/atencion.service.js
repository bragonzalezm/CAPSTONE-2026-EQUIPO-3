'use strict';

function crearAtencionService(dependencias) {
  const { agendaPropia, ahora, fallar, id, igual, objeto, pagina, personal, repository, requerido, rutValido, texto } = dependencias;
  const atenciones = {
    async registrar(ctx, d) {
      objeto(d);
      const rid = id(d.id_reserva), datos = { id_reserva: rid,
        servicio_realizado: texto(d.servicio_realizado, 'servicio_realizado', 200),
        detalle: texto(d.detalle, 'detalle', 20000), observaciones: texto(d.observaciones, 'observaciones', 10000, true) };
      return repository.conTransaccion(async tx => {
        const r = requerido(await tx.reservas.bloquearPorId(rid));
        await agendaPropia(ctx, r.rut_especialista, tx);
        if (new Date(r.fecha_hora_inicio) > ahora()) fallar('ATENCION_FUTURA', 'No puedes guardar una atención antes de la cita.', 409);
        if (await tx.atenciones.buscarPorReserva(rid)) fallar('ATENCION_EXISTENTE', 'La atención ya fue guardada y no se modifica.', 409);
        const guardada = await tx.atenciones.crear(datos);
        if (!guardada) fallar('RESERVA_NO_CONFIRMADA', 'La reserva debe estar confirmada.', 409);
        requerido(await tx.atenciones.marcarReservaRealizada(rid));
        return guardada;
      });
    },
    async listarHistorial(ctx, rut, filtros = {}) {
      await personal(ctx);
      return repository.atenciones.listarHistorial(rutValido(rut), { ...pagina(filtros),
        idEspecialidad: filtros.id_especialidad == null ? null : id(filtros.id_especialidad) });
    },
    async listarEspecialidadesConHistorial(ctx, rut) {
      await personal(ctx); return repository.atenciones.listarEspecialidadesConHistorial(rutValido(rut));
    },
    async ver(ctx, aid) { await personal(ctx); return requerido(await repository.atenciones.buscarPorId(id(aid))); },
    async obtenerBaseAnterior(ctx, { rut_cliente, id_especialidad, id_atencion = null }) {
      await personal(ctx); const rut = rutValido(rut_cliente), eid = id(id_especialidad);
      const a = id_atencion === null ? await repository.atenciones.buscarUltima(rut, eid) :
        requerido(await repository.atenciones.buscarPorId(id(id_atencion)));
      if (!a) return null;
      if (a.rut_cliente !== rut || !igual(a.id_especialidad, eid)) fallar('ATENCION_NO_CORRESPONDE', 'La atención debe ser de la misma clienta y especialidad.', 409);
      // No copiar observaciones circunstanciales; la especialista revisa el texto.
      return { id_atencion: a.id_atencion, servicio_realizado: a.servicio_realizado, detalle: a.detalle };
    }
  };
  return atenciones;
}
module.exports = crearAtencionService;
