'use strict';

function crearReservaService(dependencias) {
  const { abonoActual, actor, agendaPropia, ahora, comprobarBloque, contacto, datosReserva, especialistaHabilitada, fallar, id, mayus, minutosRetencion, pagina, personal, registrarManualTx, repository, requerido, resumenReserva, rutValido, timestamp } = dependencias;
  const reservas = {
    async crearWeb(ctx, d) {
      const datos = datosReserva(d);
      const a = ctx ? await actor(ctx) : null;
      const cliente = a ? { rut: a.rut } : { rut: rutValido(d.cliente?.rut), ...contacto(d.cliente ?? {}) };
      return repository.conTransaccion(async tx => {
        await tx.reservas.bloquearEspecialista(datos.rut_especialista);
        await especialistaHabilitada(tx, datos.rut_especialista, datos.id_especialidad);
        await comprobarBloque(tx, datos.rut_especialista, datos.fecha_hora_inicio, datos.fecha_hora_fin);
        if (a) await actor(ctx, tx); else await tx.usuarios.asegurarInvitado(cliente);
        const r = await tx.reservas.crearPendienteWeb({ ...datos, rut_cliente: cliente.rut,
          retencion_hasta: new Date(ahora().getTime() + minutosRetencion * 60000).toISOString() });
        return { ...resumenReserva(r), monto_abono: abonoActual };
      });
    },
    async crearManual(ctx, d) {
      const datos = datosReserva(d);
      const cliente = { rut: rutValido(d.cliente?.rut), ...contacto(d.cliente ?? {}) };
      return repository.conTransaccion(async tx => {
        await tx.reservas.bloquearEspecialista(datos.rut_especialista);
        await agendaPropia(ctx, datos.rut_especialista, tx);
        await especialistaHabilitada(tx, datos.rut_especialista, datos.id_especialidad);
        await comprobarBloque(tx, datos.rut_especialista, datos.fecha_hora_inicio, datos.fecha_hora_fin);
        await tx.usuarios.asegurarInvitado(cliente);
        const r = await tx.reservas.crearManual({ ...datos, rut_cliente: cliente.rut });
        if (d.pago != null) await registrarManualTx(tx, ctx, r.id_reserva, d.pago);
        return tx.reservas.buscarPorId(r.id_reserva);
      });
    },
    async listarAgenda(ctx, { desde, hasta, rut_especialista = null, id_estado = null }) {
      const a = await personal(ctx), inicio = timestamp(desde, 'desde'), fin = timestamp(hasta, 'hasta');
      const dias = (Date.parse(fin) - Date.parse(inicio)) / 86400000;
      if (dias <= 0 || dias > 31) fallar('RANGO_INVALIDO', 'Consulta un intervalo de hasta 31 días.');
      let rut = rut_especialista === null ? null : rutValido(rut_especialista);
      if (!a.roles.includes('ADMINISTRADOR')) {
        if (rut && rut !== a.rut) fallar('SIN_PERMISO', 'Solo puedes consultar tu agenda.', 403);
        rut = a.rut;
      }
      const filas = await repository.reservas.listarAgenda({ desde: inicio, hasta: fin,
        rutEspecialista: rut, idEstado: id_estado === null ? null : id(id_estado) });
      return filas.filter(r => mayus(r.estado) !== 'PENDIENTE' || r.id_pago ||
        !r.retencion_hasta || new Date(r.retencion_hasta) > ahora());
    },
    async listarMisReservas(ctx, filtros = {}) {
      const a = await actor(ctx); return repository.reservas.listarPorCliente(a.rut, pagina(filtros));
    },
    async buscarPorId(ctx, rid) {
      const a = await actor(ctx), r = requerido(await repository.reservas.buscarPorId(id(rid)));
      const laboral = a.roles.includes('ADMINISTRADOR') || (a.roles.includes('ESPECIALISTA') && r.rut_especialista === a.rut);
      if (!laboral && r.rut_cliente !== a.rut) fallar('SIN_PERMISO', 'No puedes consultar esta reserva.', 403);
      return laboral ? r : resumenReserva(r);
    },
    async cancelar(ctx, rid) {
      const reservaId = id(rid);
      return repository.conTransaccion(async tx => {
        const r = requerido(await tx.reservas.bloquearPorId(reservaId));
        const a = await actor(ctx, tx);
        if (!a.roles.includes('ADMINISTRADOR') && r.rut_cliente !== a.rut &&
            !(a.roles.includes('ESPECIALISTA') && r.rut_especialista === a.rut)) fallar('SIN_PERMISO', 'No puedes cancelar esta reserva.', 403);
        const resultado = await tx.reservas.cancelar(reservaId);
        if (!resultado) fallar('NO_CANCELABLE', 'Solo puedes cancelar reservas confirmadas futuras.', 409);
        return resumenReserva(resultado);
      });
    }
  };
  return reservas;
}
module.exports = crearReservaService;
