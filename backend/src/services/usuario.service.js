'use strict';

function crearUsuarioService(dependencias) {
  const { actor, administrador, contacto, pagina, personal, repository, requerido, rutValido, texto } = dependencias;
  const usuarios = {
    async verMiPerfil(ctx) { const a = await actor(ctx); return repository.usuarios.buscarPorRut(a.rut); },
    async actualizarMiPerfil(ctx, d) {
      const a = await actor(ctx); return requerido(await repository.usuarios.actualizarDatos(a.rut, contacto(d, true)));
    },
    async listar(ctx, filtros = {}) {
      await administrador(ctx);
      return repository.usuarios.listar({ ...pagina(filtros), busqueda: texto(filtros.busqueda, 'busqueda', 100, true) });
    },
    async verFicha(ctx, rut) { await personal(ctx); return requerido(await repository.usuarios.buscarFichaPorRut(rutValido(rut))); },
    async actualizarDatos(ctx, rut, d) {
      await administrador(ctx); const normalizado = rutValido(rut);
      const u = requerido(await repository.usuarios.buscarParaAutenticacion(normalizado));
      return requerido(await repository.usuarios.actualizarDatos(normalizado, contacto(d, Boolean(u.password))));
    },
    async actualizarPrecauciones(ctx, rut, precauciones) {
      await personal(ctx);
      return requerido(await repository.usuarios.actualizarPrecauciones(rutValido(rut), texto(precauciones, 'precauciones', 5000, true)));
    }
  };
  return usuarios;
}
module.exports = crearUsuarioService;
