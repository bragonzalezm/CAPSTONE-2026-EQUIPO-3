'use strict';

function crearPagoService(dependencias) {
  const { actor, administrador, ahora, catalogoPorNombre, comprobarBloque, entero, especialistaHabilitada, fallar, id, mayus, opciones, pagina, personal, registrarManualTx, repository, requerido, rutValido, texto } = dependencias;
  const pagos = {
    async registrarManual(ctx, rid, d) {
      return repository.conTransaccion(tx => registrarManualTx(tx, ctx, id(rid), d));
    },
    async listarMisComprobantes(ctx, filtros = {}) {
      const a = await actor(ctx); return repository.pagos.listarComprobantesPorCliente(a.rut, pagina(filtros));
    },
    async listarComprobantesCliente(ctx, rut, filtros = {}) {
      await personal(ctx); return repository.pagos.listarComprobantesPorCliente(rutValido(rut), pagina(filtros));
    },
    async listarPendientesVencidas(ctx, { limite = 50 } = {}) {
      await administrador(ctx); return repository.reservas.listarPendientesVencidas({ limite: entero(limite, 'limite', 1, 200) });
    },
    async procesarResultadoWeb(token) {
      if (typeof opciones.webpay?.verificarResultado !== 'function') fallar('INTEGRACION_PENDIENTE', 'Webpay todavía no está conectado.', 503);
      // I/O externo ANTES de tomar bloqueos de BD. No acepta aprobado=true del front.
      const verificado = await opciones.webpay.verificarResultado(texto(token, 'token', 500));
      if (!verificado || !['APROBADO', 'RECHAZADO', 'CANCELADO', 'PENDIENTE'].includes(verificado.resultado)) {
        fallar('RESPUESTA_PAGO_INVALIDA', 'El proveedor no entregó un resultado verificable.', 502);
      }
      const rid = id(verificado.id_reserva);
      if (verificado.resultado === 'PENDIENTE' || verificado.definitivo !== true) {
        return { id_reserva: rid, resultado: 'PENDIENTE' };
      }
      return repository.conTransaccion(async tx => {
        const bloqueada = await tx.reservas.bloquearPorId(rid);
        if (!bloqueada) {
          if (verificado.resultado === 'APROBADO') fallar('PAGO_SIN_RESERVA', 'Pago aprobado sin reserva local: requiere conciliación administrativa.', 409);
          return { id_reserva: rid, resultado: 'DESCARTADA' };
        }
        const r = requerido(await tx.reservas.buscarPorId(rid));
        if (mayus(r.origen) !== 'WEB') fallar('ORIGEN_INVALIDO', 'La operación no corresponde a una reserva web.', 409);
        if (verificado.resultado !== 'APROBADO') {
          if (await tx.pagos.buscarPorReserva(rid)) return { id_reserva: rid, resultado: 'PAGO_YA_REGISTRADO' };
          if (mayus(r.estado) === 'PENDIENTE') await tx.reservas.eliminarPendienteSinPago(rid);
          return { id_reserva: rid, resultado: verificado.resultado };
        }
        const monto = entero(verificado.monto, 'monto', 1);
        const esperado = entero(verificado.monto_esperado, 'monto_esperado', 1);
        const medio = await catalogoPorNombre(tx, 'medio_pago', 'WEBPAY');
        const pago = await tx.pagos.registrarRecibido({ id_reserva: rid, id_medio: medio.id_medio,
          monto, referencia_transaccion: texto(verificado.referencia_transaccion, 'referencia_transaccion', 150) });
        // Conservar un pago realmente recibido incluso si requiere revisión.
        if (monto !== esperado) return { id_reserva: rid, id_pago: pago.id_pago, resultado: 'REQUIERE_REVISION', motivo: 'MONTO_DISTINTO' };
        if (['CONFIRMADA', 'REALIZADA', 'CANCELADA'].includes(mayus(r.estado))) {
          return { id_reserva: rid, id_pago: pago.id_pago, resultado: r.estado };
        }
        let motivo = null;
        if (new Date(r.fecha_hora_inicio) <= ahora()) motivo = 'FECHA_PASADA';
        try {
          await especialistaHabilitada(tx, r.rut_especialista, r.id_especialidad);
          await comprobarBloque(tx, r.rut_especialista, new Date(r.fecha_hora_inicio).toISOString(), new Date(r.fecha_hora_fin).toISOString(), false);
        } catch (e) {
          if (!['ESPECIALISTA_NO_HABILITADA', 'ESPECIALIDAD_NO_HABILITADA', 'FUERA_DE_HORARIO'].includes(e.code)) throw e;
          motivo = e.code;
        }
        const cruces = await tx.reservas.buscarSolapamientos({ rutEspecialista: r.rut_especialista,
          inicio: r.fecha_hora_inicio, fin: r.fecha_hora_fin, excluirId: rid });
        if (cruces.length) motivo = 'HORARIO_OCUPADO';
        if (motivo) return { id_reserva: rid, id_pago: pago.id_pago, resultado: 'REQUIERE_REVISION', motivo };
        requerido(await tx.reservas.confirmarWebPagada(rid));
        return { id_reserva: rid, id_pago: pago.id_pago, resultado: 'CONFIRMADA' };
      });
    }
  };
  return pagos;
}
module.exports = crearPagoService;
