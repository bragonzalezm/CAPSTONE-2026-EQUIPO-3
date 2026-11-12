'use strict';

function crearCatalogoService(dependencias) {
  const { administrador, booleano, catalogoPorId, datosServicio, fallar, id, repository, requerido } = dependencias;
  const catalogo = {
    async listarParametros(nombre) {
      if (!['rol', 'tipo_precio', 'dia_semana', 'origen_reserva', 'estado_reserva', 'medio_pago'].includes(nombre)) {
        fallar('CATALOGO_INVALIDO', 'Catálogo no permitido.');
      }
      return repository.catalogos.listar(nombre);
    },
    listarServicios({ idEspecialidad = null } = {}) {
      return repository.servicios.listar({ idEspecialidad: idEspecialidad === null ? null : id(idEspecialidad) });
    },
    async listarGestion(ctx) { await administrador(ctx); return repository.servicios.listar({ soloActivos: false }); },
    async crearServicio(ctx, d) {
      await administrador(ctx); const datos = datosServicio(d);
      requerido(await repository.especialidades.buscarPorId(datos.id_especialidad));
      await catalogoPorId(repository, 'tipo_precio', 'id_tipo_precio', datos.id_tipo_precio);
      return repository.servicios.crear(datos);
    },
    async actualizarServicio(ctx, sid, d) {
      await administrador(ctx); const datos = datosServicio(d);
      requerido(await repository.especialidades.buscarPorId(datos.id_especialidad));
      await catalogoPorId(repository, 'tipo_precio', 'id_tipo_precio', datos.id_tipo_precio);
      return requerido(await repository.servicios.actualizar(id(sid), { ...datos, activo: booleano(d.activo, 'activo') }));
    },
    async cambiarActivo(ctx, sid, activo) {
      await administrador(ctx); return requerido(await repository.servicios.cambiarActivo(id(sid), booleano(activo, 'activo')));
    }
  };
  return catalogo;
}
module.exports = crearCatalogoService;
