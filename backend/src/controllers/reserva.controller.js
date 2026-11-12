'use strict';

function crearReservaController(dependencias) {
  const { accion, contexto, datosReserva, idParametro, paginacion, queryId, queryTexto, responder, servicios } = dependencias;
  const reservas = {
    // Body: rut_especialista, id_especialidad, fecha_hora_inicio, fecha_hora_fin,
    // motivo, indicaciones. Invitado: además cliente:{rut,nombres,apellidos,
    // telefono,correo}. Con sesión se usa SU RUT y se ignora cliente del body.
    crearWeb: accion(async (req, res) => {
      const ctx = contexto(req, false);
      const datos = datosReserva(req, { incluirCliente: !ctx });
      return responder(res, await servicios.reservas.crearWeb(ctx, datos), 201,
        'Horario retenido temporalmente. La reserva aún requiere aprobación del abono.');
    }),
    // Body: mismos datos + cliente obligatorio; pago opcional:
    // {id_medio, monto, referencia_transaccion, recibido:true}.
    // Sin pago o pago:null crea la reserva manual sin inventar un abono.
    crearManual: accion(async (req, res) => responder(res,
      await servicios.reservas.crearManual(contexto(req), datosReserva(req, { incluirCliente: true, incluirPago: true })),
      201, 'Reserva manual confirmada.')),
    // Query: desde, hasta (ISO con zona); rut_especialista e id_estado opcionales.
    listarAgenda: accion(async (req, res) => responder(res,
      await servicios.reservas.listarAgenda(contexto(req), {
        desde: queryTexto(req, 'desde', { obligatorio: true }),
        hasta: queryTexto(req, 'hasta', { obligatorio: true }),
        rut_especialista: queryTexto(req, 'rut_especialista', { defecto: null }),
        id_estado: queryId(req, 'id_estado')
      }))),
    // Query: limite, desplazamiento. RUT exclusivamente de la sesión.
    listarMisReservas: accion(async (req, res) => responder(res,
      await servicios.reservas.listarMisReservas(contexto(req), paginacion(req)))),
    // Params: id_reserva. Servicio comprueba que pueda consultarla.
    buscarPorId: accion(async (req, res) => responder(res,
      await servicios.reservas.buscarPorId(contexto(req), idParametro(req, 'id_reserva')))),
    // Params: id_reserva. Conserva el abono recibido. Sin devolución automática.
    cancelar: accion(async (req, res) => responder(res,
      await servicios.reservas.cancelar(contexto(req), idParametro(req, 'id_reserva')),
      200, 'Reserva cancelada. Los comprobantes de abono se conservan.'))
  };
  return reservas;
}
module.exports = crearReservaController;
