'use strict';

function crearPagoRepository(dependencias) {
  const { bloquearReserva, errorRepositorio, paginacion, uno, varios } = dependencias;
  const pagos = {
    buscarPorReserva(idReserva) {
      return uno(`SELECT p.*,m.nombre AS medio_pago FROM pago p JOIN medio_pago m USING(id_medio)
        WHERE p.id_reserva=$1`, [idReserva]);
    },
    buscarPorReferencia(idMedio, referencia) {
      return uno('SELECT * FROM pago WHERE id_medio=$1 AND referencia_transaccion=$2', [idMedio, referencia]);
    },
    // El servicio ya verificó Webpay o el cobro manual. Nunca registrar rechazos.
    // Web: registrarRecibido + confirmarWebPagada en UNA conTransaccion.
    async registrarRecibido({ id_reserva, id_medio, monto, referencia_transaccion = null }) {
      const r = await bloquearReserva(id_reserva);
      if (!r) throw errorRepositorio('RESERVA_NO_EXISTE', 'No existe la reserva del pago.');
      const insertado = await uno(`INSERT INTO pago(id_reserva,id_medio,monto,referencia_transaccion)
        VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`,
      [id_reserva, id_medio, monto, referencia_transaccion]);
      if (insertado) return insertado;
      const anterior = await uno('SELECT * FROM pago WHERE id_reserva=$1', [id_reserva]);
      if (anterior && String(anterior.id_medio) === String(id_medio) &&
          String(anterior.monto) === String(monto) && anterior.referencia_transaccion === referencia_transaccion) {
        return anterior;
      }
      throw errorRepositorio('PAGO_CONFLICTIVO', 'La reserva o referencia ya tiene un pago diferente.');
    },
    // Incluye pagos de reservas canceladas. NO representa un saldo disponible:
    // este modelo no registra qué comprobantes antiguos se descontaron en local.
    listarComprobantesPorCliente(rut, { limite = 50, desplazamiento = 0 } = {}) {
      const [l, d] = paginacion(limite, desplazamiento);
      return varios(`SELECT p.*,m.nombre AS medio_pago,r.fecha_hora_inicio,e.nombre AS estado_reserva
        FROM pago p JOIN reserva r USING(id_reserva) JOIN medio_pago m USING(id_medio)
        JOIN estado_reserva e USING(id_estado) WHERE r.rut_cliente=$1
        ORDER BY r.fecha_hora_inicio DESC,p.id_pago DESC LIMIT $2 OFFSET $3`, [rut, l, d]);
    }
  };
  return pagos;
}
module.exports = crearPagoRepository;
