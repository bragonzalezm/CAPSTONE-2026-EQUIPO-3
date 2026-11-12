'use strict';

function crearHorarioController(dependencias) {
  const { accion, bodyCampos, camposHorario, contexto, idParametro, parametro, queryId, queryTexto, responder, servicios } = dependencias;
  const horarios = {
    calendario: accion(async(req,res)=>responder(res,await servicios.horarios.calendario(contexto(req),{
      rut_especialista:queryTexto(req,'rut_especialista',{obligatorio:true}),desde:queryTexto(req,'desde',{obligatorio:true}),hasta:queryTexto(req,'hasta',{obligatorio:true})}))),
    aplicarPredeterminados: accion(async(req,res)=>responder(res,await servicios.horarios.aplicarPredeterminados(contexto(req),bodyCampos(req,['rut_especialista','reemplazar'])))),
    bloquearFecha: accion(async(req,res)=>responder(res,await servicios.horarios.bloquearFecha(contexto(req),bodyCampos(req,['rut_especialista','fecha','hora_inicio','hora_fin','motivo'])),201)),
    desbloquearFecha: accion(async(req,res)=>responder(res,await servicios.horarios.desbloquearFecha(contexto(req),parametro(req,'rut_especialista'),idParametro(req,'id_bloqueo')))),
    // Params: rut_especialista. Servicio comprueba agenda propia o Administrador.
    listarGestion: accion(async (req, res) => responder(res,
      await servicios.horarios.listarGestion(contexto(req), parametro(req, 'rut_especialista')))),
    // Pública. Query: rut_especialista, id_especialidad, desde, hasta (YYYY-MM-DD).
    consultarDisponibilidad: accion(async (req, res) => responder(res,
      await servicios.horarios.consultarDisponibilidad({
        rut_especialista: queryTexto(req, 'rut_especialista', { obligatorio: true }),
        id_especialidad: queryId(req, 'id_especialidad', true),
        desde: queryTexto(req, 'desde', { obligatorio: true }),
        hasta: queryTexto(req, 'hasta', { obligatorio: true })
      }))),
    // Body: rut_especialista, id_dia (número), hora_inicio, hora_fin.
    crear: accion(async (req, res) => responder(res,
      await servicios.horarios.crear(contexto(req), bodyCampos(req, ['rut_especialista', ...camposHorario])), 201)),
    // Params: rut_especialista, id_horario. Body: id_dia, hora_inicio, hora_fin.
    actualizar: accion(async (req, res) => responder(res,
      await servicios.horarios.actualizar(contexto(req), parametro(req, 'rut_especialista'),
        idParametro(req, 'id_horario'), bodyCampos(req, camposHorario)))),
    // Params: rut_especialista, id_horario.
    eliminar: accion(async (req, res) => responder(res,
      await servicios.horarios.eliminar(contexto(req), parametro(req, 'rut_especialista'), idParametro(req, 'id_horario'))))
  };
  return horarios;
}
module.exports = crearHorarioController;
