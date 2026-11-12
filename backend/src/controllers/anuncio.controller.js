'use strict';

function crearAnuncioController(dependencias) {
  const { accion, bodyCampos, camposAnuncio, contexto, idParametro, responder, servicios } = dependencias;
  const anuncios = {
    listarPublicos: accion(async (req, res) => responder(res,
      await servicios.anuncios.listarPublicos())),
    listarGestion: accion(async (req, res) => responder(res,
      await servicios.anuncios.listarGestion(contexto(req)))),
    // Body: titulo, contenido, imagen_url opcional, orden opcional.
    crear: accion(async (req, res) => responder(res,
      await servicios.anuncios.crear(contexto(req), bodyCampos(req, camposAnuncio)), 201)),
    // Params: id_anuncio. Body: campos anteriores + activo.
    actualizar: accion(async (req, res) => responder(res,
      await servicios.anuncios.actualizar(contexto(req), idParametro(req, 'id_anuncio'),
        bodyCampos(req, [...camposAnuncio, 'activo'])))),
    // Params: id_anuncio.
    eliminar: accion(async (req, res) => responder(res,
      await servicios.anuncios.eliminar(contexto(req), idParametro(req, 'id_anuncio'))))
  };
  return anuncios;
}
module.exports = crearAnuncioController;
