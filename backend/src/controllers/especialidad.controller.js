'use strict';

function crearEspecialidadController(dependencias) {
  const { accion, bodyCampos, contexto, cuerpo, idParametro, parametro, responder, servicios } = dependencias;
  const especialidades = {
    listarPublicas: accion(async (req, res) => responder(res,
      await servicios.especialidades.listarPublicas())),
    listarGestion: accion(async (req, res) => responder(res,
      await servicios.especialidades.listarGestion(contexto(req)))),
    // Params: id_especialidad. Devuelve especialistas habilitadas públicamente.
    listarEspecialistas: accion(async (req, res) => responder(res,
      await servicios.especialidades.listarEspecialistas(idParametro(req, 'id_especialidad')))),
    // Body: nombre.
    crear: accion(async (req, res) => responder(res,
      await servicios.especialidades.crear(contexto(req), cuerpo(req).nombre), 201)),
    // Params: id_especialidad. Body: nombre, activa (booleano).
    actualizar: accion(async (req, res) => responder(res,
      await servicios.especialidades.actualizar(contexto(req), idParametro(req, 'id_especialidad'),
        bodyCampos(req, ['nombre', 'activa'])))),
    // Params: rut. Body: id_especialidad.
    asignar: accion(async (req, res) => responder(res,
      await servicios.especialidades.asignar(contexto(req), parametro(req, 'rut'), cuerpo(req).id_especialidad))),
    // Params: rut, id_especialidad.
    retirarAsignacion: accion(async (req, res) => responder(res,
      await servicios.especialidades.retirarAsignacion(contexto(req), parametro(req, 'rut'), idParametro(req, 'id_especialidad'))))
  };
  return especialidades;
}
module.exports = crearEspecialidadController;
