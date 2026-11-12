'use strict';

function crearUsuarioController(dependencias) {
  const { accion, bodyCampos, camposContacto, contexto, cuerpo, incorrecto, paginacion, parametro, queryTexto, responder, servicios } = dependencias;
  const usuarios = {
    verMiPerfil: accion(async (req, res) => responder(res,
      await servicios.usuarios.verMiPerfil(contexto(req)))),
    actualizarMiPerfil: accion(async (req, res) => responder(res,
      await servicios.usuarios.actualizarMiPerfil(contexto(req), bodyCampos(req, camposContacto)))),
    // Query opcional: busqueda, limite, desplazamiento. Solo Administrador.
    listar: accion(async (req, res) => responder(res,
      await servicios.usuarios.listar(contexto(req), {
        ...paginacion(req), busqueda: queryTexto(req, 'busqueda', { defecto: '' })
      }))),
    // Params: rut. Ficha con precauciones, solo personal autorizado.
    verFicha: accion(async (req, res) => responder(res,
      await servicios.usuarios.verFicha(contexto(req), parametro(req, 'rut')))),
    // Params: rut. Body: datos completos de contacto. Solo Administrador.
    actualizarDatos: accion(async (req, res) => responder(res,
      await servicios.usuarios.actualizarDatos(contexto(req), parametro(req, 'rut'), bodyCampos(req, camposContacto)))),
    // Params: rut. Body: precauciones (cadena vacía para borrar el texto).
    actualizarPrecauciones: accion(async (req, res) => {
      const b = cuerpo(req);
      if (!Object.hasOwn(b, 'precauciones')) incorrecto('Debes enviar precauciones.');
      return responder(res, await servicios.usuarios.actualizarPrecauciones(contexto(req), parametro(req, 'rut'), b.precauciones));
    })
  };
  return usuarios;
}
module.exports = crearUsuarioController;
