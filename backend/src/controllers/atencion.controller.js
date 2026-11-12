'use strict';

function crearAtencionController(dependencias) {
  const { accion, bodyCampos, contexto, idParametro, paginacion, parametro, queryId, queryTexto, responder, servicios } = dependencias;
  const atenciones = {
    // Body: id_reserva, servicio_realizado, detalle, observaciones.
    // Guarda definitivamente y marca la reserva Realizada mediante el servicio.
    registrar: accion(async (req, res) => responder(res,
      await servicios.atenciones.registrar(contexto(req),
        bodyCampos(req, ['id_reserva', 'servicio_realizado', 'detalle', 'observaciones'])),
      201, 'Atención guardada.')),
    // Params: rut. Query: id_especialidad, limite, desplazamiento. Solo personal.
    listarHistorial: accion(async (req, res) => responder(res,
      await servicios.atenciones.listarHistorial(contexto(req), parametro(req, 'rut'), {
        ...paginacion(req), id_especialidad: queryId(req, 'id_especialidad')
      }))),
    // Params: rut.
    listarEspecialidadesConHistorial: accion(async (req, res) => responder(res,
      await servicios.atenciones.listarEspecialidadesConHistorial(contexto(req), parametro(req, 'rut')))),
    // Params: id_atencion.
    ver: accion(async (req, res) => responder(res,
      await servicios.atenciones.ver(contexto(req), idParametro(req, 'id_atencion')))),
    // Query: rut_cliente, id_especialidad; id_atencion opcional para elegir otra.
    // Devuelve texto base, no crea ni modifica ninguna atención.
    obtenerBaseAnterior: accion(async (req, res) => responder(res,
      await servicios.atenciones.obtenerBaseAnterior(contexto(req), {
        rut_cliente: queryTexto(req, 'rut_cliente', { obligatorio: true }),
        id_especialidad: queryId(req, 'id_especialidad', true),
        id_atencion: queryId(req, 'id_atencion')
      })))
  };
  return atenciones;
}
module.exports = crearAtencionController;
