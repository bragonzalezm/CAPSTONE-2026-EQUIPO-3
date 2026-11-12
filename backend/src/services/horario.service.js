'use strict';

function crearHorarioService(dependencias) {
  const { agendaPropia, comprobarReservasConservadas, datosHorario, especialistaHabilitada, fallar, fechaLocalValida, id, igual, repository, requerido, rutValido, validarHorarioSinCruces } = dependencias;
  const horarios = {
    async listarGestion(ctx, rut) {
      const normalizado = rutValido(rut); await agendaPropia(ctx, normalizado);
      return repository.horarios.listarPorEspecialista(normalizado);
    },
    async consultarDisponibilidad({ rut_especialista, id_especialidad, desde, hasta }) {
      const rut = rutValido(rut_especialista); const eid = id(id_especialidad);
      fechaLocalValida(desde); fechaLocalValida(hasta);
      const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000;
      if (dias < 0 || dias > 30) fallar('RANGO_INVALIDO', 'Consulta como máximo 31 días consecutivos.');
      await especialistaHabilitada(repository, rut, eid);
      return repository.horarios.listarBloques({ rutEspecialista: rut, desde, hasta });
    },
    async crear(ctx, d) {
      const rut = rutValido(d.rut_especialista), datos = datosHorario(d);
      return repository.conTransaccion(async tx => {
        await tx.reservas.bloquearEspecialista(rut); await agendaPropia(ctx, rut, tx);
        await especialistaHabilitada(tx, rut); await validarHorarioSinCruces(tx, rut, datos);
        return tx.horarios.crear({ rut_especialista: rut, ...datos });
      });
    },
    async actualizar(ctx, rut, hid, d) {
      const normalizado = rutValido(rut), horarioId = id(hid), datos = datosHorario(d);
      return repository.conTransaccion(async tx => {
        await tx.reservas.bloquearEspecialista(normalizado); await agendaPropia(ctx, normalizado, tx);
        const existentes = await tx.horarios.listarPorEspecialista(normalizado);
        requerido(existentes.find(h => igual(h.id_horario, horarioId)));
        await validarHorarioSinCruces(tx, normalizado, datos, horarioId);
        const actualizado = requerido(await tx.horarios.actualizar(horarioId, datos));
        await comprobarReservasConservadas(tx, normalizado);
        return actualizado;
      });
    },
    async eliminar(ctx, rut, hid) {
      const normalizado = rutValido(rut), horarioId = id(hid);
      return repository.conTransaccion(async tx => {
        await tx.reservas.bloquearEspecialista(normalizado); await agendaPropia(ctx, normalizado, tx);
        requerido((await tx.horarios.listarPorEspecialista(normalizado)).find(h => igual(h.id_horario, horarioId)));
        const eliminado = requerido(await tx.horarios.eliminar(horarioId));
        await comprobarReservasConservadas(tx, normalizado);
        return eliminado;
      });
    }
  };
  return horarios;
}
module.exports = crearHorarioService;
