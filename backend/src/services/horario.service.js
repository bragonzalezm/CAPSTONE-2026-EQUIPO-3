'use strict';

function crearHorarioService(dependencias) {
  const { ahora, texto, fechaChile, hora, agendaPropia, comprobarReservasConservadas, datosHorario, especialistaHabilitada, fallar, fechaLocalValida, id, igual, repository, requerido, rutValido, validarHorarioSinCruces } = dependencias;
  const predeterminados = [['10:00:00','12:00:00'],['12:01:00','14:00:00'],['15:00:00','17:00:00'],['17:01:00','19:00:00']];
  function rango(desde,hasta) { fechaLocalValida(desde);fechaLocalValida(hasta);const dias=(Date.parse(hasta)-Date.parse(desde))/86400000;if(dias<0||dias>30)fallar('RANGO_INVALIDO','Consulta como máximo 31 días.'); }
  const horarios = {
    async calendario(ctx,d) {
      const rut=rutValido(d.rut_especialista);await agendaPropia(ctx,rut);rango(d.desde,d.hasta);
      const limites=await repository.horarios.limitesLocales(d.desde,d.hasta);
      const [bloques,reservas,bloqueos]=await Promise.all([
        repository.horarios.listarBloques({rutEspecialista:rut,desde:d.desde,hasta:d.hasta}),
        repository.reservas.listarAgenda({rutEspecialista:rut,desde:limites.inicio,hasta:limites.fin}),
        repository.horarios.listarBloqueos(rut,d.desde,d.hasta)]);
      return {bloques,reservas,bloqueos};
    },
    async aplicarPredeterminados(ctx,d) {
      const rut=rutValido(d.rut_especialista);
      return repository.conTransaccion(async tx=>{
        await tx.reservas.bloquearEspecialista(rut);await agendaPropia(ctx,rut,tx);await especialistaHabilitada(tx,rut);
        const anteriores=await tx.horarios.listarPorEspecialista(rut);
        if(anteriores.length&&d.reemplazar!==true)fallar('CONFIRMACION_REQUERIDA','Confirma el reemplazo del horario semanal.',409);
        await tx.horarios.borrarSemanales(rut);
        for(let dia=1;dia<=6;dia++)for(const [inicio,fin] of predeterminados)await tx.horarios.crear({rut_especialista:rut,id_dia:dia,hora_inicio:inicio,hora_fin:fin});
        await comprobarReservasConservadas(tx,rut);
        return tx.horarios.listarPorEspecialista(rut);
      });
    },
    async bloquearFecha(ctx,d) {
      const rut=rutValido(d.rut_especialista);fechaLocalValida(d.fecha);
      const inicio=hora(d.hora_inicio),fin=hora(d.hora_fin);
      if(inicio<'10:00:00'||fin>'19:00:00'||fin<=inicio)fallar('INTERVALO_INVALIDO','Usa una franja entre 10:00 y 19:00.');
      if(d.fecha<fechaChile(ahora()))fallar('FECHA_PASADA','Elige hoy o una fecha futura.');
      const motivo=texto(d.motivo,'motivo',300,true);
      return repository.conTransaccion(async tx=>{
        await tx.reservas.bloquearEspecialista(rut);await agendaPropia(ctx,rut,tx);await especialistaHabilitada(tx,rut);
        const intervalo=await tx.horarios.intervaloLocal(d.fecha,inicio,fin);
        const reservas=await tx.reservas.buscarSolapamientos({rutEspecialista:rut,inicio:intervalo.inicio,fin:intervalo.fin});
        if(reservas.length)fallar('RESERVAS_AFECTADAS','Hay reservas o retenciones en esta franja. Resuélvelas antes de bloquearla.',409,{reservas:reservas.map(r=>r.id_reserva)});
        const bloqueos=await tx.horarios.listarBloqueos(rut,d.fecha,d.fecha);
        if(bloqueos.some(x=>x.hora_inicio<fin&&x.hora_fin>inicio))fallar('BLOQUEO_EXISTENTE','La franja se cruza con un bloqueo existente.',409);
        return tx.horarios.crearBloqueo(rut,{fecha:d.fecha,hora_inicio:inicio,hora_fin:fin,motivo});
      });
    },
    async desbloquearFecha(ctx,rut,idBloqueo) {
      rut=rutValido(rut);const bid=id(idBloqueo);
      return repository.conTransaccion(async tx=>{await tx.reservas.bloquearEspecialista(rut);await agendaPropia(ctx,rut,tx);return requerido(await tx.horarios.eliminarBloqueo(rut,bid));});
    },
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
