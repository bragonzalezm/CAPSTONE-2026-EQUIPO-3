'use strict';

function crearEspecialidadService(dependencias) {
  const { administrador, booleano, especialistaHabilitada, id, repository, requerido, rutValido, texto } = dependencias;
  const especialidades = {
    listarPublicas() { return repository.especialidades.listar(); },
    async listarGestion(ctx) { await administrador(ctx); return repository.especialidades.listar({ soloActivas: false }); },
    async listarEspecialistas(idEspecialidad) { return repository.especialidades.listarEspecialistas(id(idEspecialidad)); },
    async crear(ctx, nombre) { await administrador(ctx); return repository.especialidades.crear(texto(nombre, 'nombre', 100)); },
    async actualizar(ctx, idEspecialidad, d) {
      await administrador(ctx);
      return requerido(await repository.especialidades.actualizar(id(idEspecialidad), {
        nombre: texto(d.nombre, 'nombre', 100), activa: booleano(d.activa, 'activa') }));
    },
    async asignar(ctx, rut, idEspecialidad) {
      const normalizado = rutValido(rut), eid = id(idEspecialidad);
      return repository.conTransaccion(async tx => {
        await administrador(ctx, tx); await tx.reservas.bloquearEspecialista(normalizado);
        await especialistaHabilitada(tx, normalizado);
        requerido(await tx.especialidades.buscarPorId(eid));
        await tx.especialidades.asignar(normalizado, eid);
        return tx.especialidades.listarPorUsuario(normalizado);
      });
    },
    async retirarAsignacion(ctx, rut, idEspecialidad) {
      const normalizado = rutValido(rut), eid = id(idEspecialidad);
      return repository.conTransaccion(async tx => {
        await administrador(ctx, tx); await tx.reservas.bloquearEspecialista(normalizado);
        return tx.especialidades.retirarAsignacion(normalizado, eid);
      });
    }
  };
  return especialidades;
}
module.exports = crearEspecialidadService;
