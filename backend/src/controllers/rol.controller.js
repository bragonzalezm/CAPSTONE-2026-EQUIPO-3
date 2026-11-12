'use strict';

function crearRolController(dependencias) {
  const { accion, contexto, cuerpo, idParametro, parametro, responder, servicios } = dependencias;
  const roles = {
    // Params: rut. El servicio requiere Administrador en todas estas operaciones.
    listarPorUsuario: accion(async (req, res) => responder(res,
      await servicios.roles.listarPorUsuario(contexto(req), parametro(req, 'rut')))),
    // Params: rut. Body: id_rol.
    asignar: accion(async (req, res) => responder(res,
      await servicios.roles.asignar(contexto(req), parametro(req, 'rut'), cuerpo(req).id_rol))),
    // Params: rut, id_rol. No body.
    retirar: accion(async (req, res) => responder(res,
      await servicios.roles.retirar(contexto(req), parametro(req, 'rut'), idParametro(req, 'id_rol'))))
  };
  return roles;
}
module.exports = crearRolController;
