'use strict';

function crearRolService(dependencias) {
  const { administrador, catalogoPorId, catalogoPorNombre, fallar, id, igual, mayus, repository, requerido, rutValido } = dependencias;
  const roles = {
    async listarPorUsuario(ctx, rut) { await administrador(ctx); return repository.roles.listarPorUsuario(rutValido(rut)); },
    async asignar(ctx, rut, idRol) {
      const destino = rutValido(rut), rolId = id(idRol);
      return repository.conTransaccion(async tx => {
        requerido(await tx.roles.bloquearAdministracion()); await administrador(ctx, tx);
        await tx.reservas.bloquearEspecialista(destino);
        const u = requerido(await tx.usuarios.buscarParaAutenticacion(destino));
        if (!u.password) fallar('CUENTA_REQUERIDA', 'Primero habilita la cuenta de esta persona.', 409);
        await catalogoPorId(tx, 'rol', 'id_rol', rolId);
        await tx.roles.asignar(destino, rolId);
        const cliente = await catalogoPorNombre(tx, 'rol', 'CLIENTE');
        await tx.roles.asignar(destino, cliente.id_rol);
        return tx.roles.listarPorUsuario(destino);
      });
    },
    async retirar(ctx, rut, idRol) {
      const destino = rutValido(rut), rolId = id(idRol);
      return repository.conTransaccion(async tx => {
        requerido(await tx.roles.bloquearAdministracion()); await administrador(ctx, tx);
        await tx.reservas.bloquearEspecialista(destino);
        const rol = await catalogoPorId(tx, 'rol', 'id_rol', rolId);
        if (mayus(rol.nombre) === 'CLIENTE') fallar('ROL_BASE', 'La cuenta conserva su acceso como Cliente.', 409);
        const asignados = await tx.roles.listarPorUsuario(destino);
        if (mayus(rol.nombre) === 'ADMINISTRADOR' && asignados.some(r => igual(r.id_rol, rolId)) &&
            await tx.roles.contarAdministradores() <= 1) fallar('ULTIMO_ADMINISTRADOR', 'No puedes retirar al último Administrador.', 409);
        await tx.roles.retirar(destino, rolId);
        return tx.roles.listarPorUsuario(destino);
      });
    }
  };
  return roles;
}
module.exports = crearRolService;
