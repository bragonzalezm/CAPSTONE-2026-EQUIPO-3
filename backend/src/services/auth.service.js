'use strict';

function crearAuthService(dependencias) {
  const { actor, administrador, catalogoPorNombre, confirmarPassword, contacto, correoValido, fallar, generarHash, objeto, repository, requerido, rutValido, verificarHash } = dependencias;
  const auth = {
    async registrarCuenta(d) {
      objeto(d);
      const rut = rutValido(d.rut), datos = contacto(d, true);
      const hash = await generarHash(confirmarPassword(d));
      return repository.conTransaccion(async tx => {
        if (await tx.usuarios.buscarPorRut(rut)) {
          fallar('REGISTRO_NO_DISPONIBLE', 'Este RUT ya está registrado. Inicia sesión o solicita ayuda al personal.', 409);
        }
        const usuario = await tx.usuarios.crear({ rut, ...datos, password: hash });
        const rol = await catalogoPorNombre(tx, 'rol', 'CLIENTE');
        await tx.roles.asignar(rut, rol.id_rol);
        return usuario;
      });
    },
    async iniciarSesion({ rut, password }) {
      const normalizado = rutValido(rut);
      const u = await repository.usuarios.buscarParaAutenticacion(normalizado);
      if (!u?.password || !await verificarHash(password, u.password)) fallar('CREDENCIALES_INVALIDAS', 'RUT o contraseña incorrectos.', 401);
      const { password: omitida, ...usuario } = u;
      return { usuario, roles: await repository.roles.listarPorUsuario(normalizado) };
    },
    async cambiarPassword(ctx, d) {
      objeto(d);
      const a = await actor(ctx);
      const u = await repository.usuarios.buscarParaAutenticacion(a.rut);
      if (!await verificarHash(d.password_actual, u.password)) fallar('CREDENCIALES_INVALIDAS', 'La contraseña actual no es correcta.', 401);
      return requerido(await repository.usuarios.actualizarPassword(a.rut, await generarHash(confirmarPassword(d))));
    },
    async habilitarCuentaExistente(ctx, rut, d) {
      objeto(d);
      await administrador(ctx);
      if (d.identidad_verificada !== true) fallar('IDENTIDAD_PENDIENTE', 'El Administrador debe verificar a la persona antes de habilitar su cuenta.');
      const normalizado = rutValido(rut), hash = await generarHash(confirmarPassword(d));
      return repository.conTransaccion(async tx => {
        await administrador(ctx, tx);
        const u = requerido(await tx.usuarios.buscarPorRut(normalizado));
        correoValido(u.correo, true);
        const habilitada = await tx.usuarios.habilitarCuenta(normalizado, hash);
        if (!habilitada) fallar('CUENTA_EXISTENTE', 'La cuenta ya tiene contraseña.', 409);
        const rol = await catalogoPorNombre(tx, 'rol', 'CLIENTE');
        await tx.roles.asignar(normalizado, rol.id_rol);
        return habilitada;
      });
    }
  };
  return auth;
}
module.exports = crearAuthService;
