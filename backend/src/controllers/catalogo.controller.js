'use strict';

function crearCatalogoController(dependencias) {
  const { accion, bodyCampos, camposServicio, contexto, cuerpo, idParametro, parametro, queryId, responder, servicios } = dependencias;
  const catalogo = {
    // Params: nombre. Solo tablas permitidas por el servicio, nunca SQL dinámico.
    listarParametros: accion(async (req, res) => responder(res,
      await servicios.catalogo.listarParametros(parametro(req, 'nombre')))),
    // Query opcional: id_especialidad. Solo catálogo público activo.
    listarServicios: accion(async (req, res) => responder(res,
      await servicios.catalogo.listarServicios({ idEspecialidad: queryId(req, 'id_especialidad') }))),
    listarGestion: accion(async (req, res) => responder(res,
      await servicios.catalogo.listarGestion(contexto(req)))),
    // Body: id_especialidad, id_tipo_precio, nombre, descripcion, precio, precio_oferta.
    crearServicio: accion(async (req, res) => responder(res,
      await servicios.catalogo.crearServicio(contexto(req), bodyCampos(req, camposServicio)), 201)),
    // Params: id_servicio. Body: campos anteriores + activo.
    actualizarServicio: accion(async (req, res) => responder(res,
      await servicios.catalogo.actualizarServicio(contexto(req), idParametro(req, 'id_servicio'),
        bodyCampos(req, [...camposServicio, 'activo'])))),
    // Params: id_servicio. Body: activo (booleano, no string).
    cambiarActivo: accion(async (req, res) => responder(res,
      await servicios.catalogo.cambiarActivo(contexto(req), idParametro(req, 'id_servicio'), cuerpo(req).activo)))
  };
  return catalogo;
}
module.exports = crearCatalogoController;
