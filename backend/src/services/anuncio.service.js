'use strict';

function crearAnuncioService(dependencias) {
  const { administrador, booleano, datosAnuncio, id, repository, requerido } = dependencias;
  const anuncios = {
    listarPublicos() { return repository.anuncios.listar(); },
    async listarGestion(ctx) { await administrador(ctx); return repository.anuncios.listar({ soloActivos: false }); },
    async crear(ctx, d) { await administrador(ctx); return repository.anuncios.crear(datosAnuncio(d)); },
    async actualizar(ctx, aid, d) {
      await administrador(ctx); return requerido(await repository.anuncios.actualizar(id(aid), { ...datosAnuncio(d), activo: booleano(d.activo, 'activo') }));
    },
    async eliminar(ctx, aid) { await administrador(ctx); return requerido(await repository.anuncios.eliminar(id(aid))); }
  };
  return anuncios;
}
module.exports = crearAnuncioService;
