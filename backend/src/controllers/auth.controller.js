'use strict';

function crearAuthController(dependencias) {
  const { accion, bodyCampos, camposContacto, contexto, cookieAlSalir, exigirMiddlewareSesion, guardarSesionNueva, nombreCookie, operacionSesion, parametro, responder, servicios } = dependencias;
  const auth = {
    // Body: rut, contacto, password, confirmacion_password. No admite roles.
    registrarCuenta: accion(async (req, res) => {
      const datos = bodyCampos(req, ['rut', ...camposContacto, 'password', 'confirmacion_password']);
      return responder(res, await servicios.auth.registrarCuenta(datos), 201, 'Cuenta creada. Ya puedes iniciar sesión.');
    }),
    // Body: rut, password. El RUT autenticado se guarda solo en la sesión.
    iniciarSesion: accion(async (req, res) => {
      exigirMiddlewareSesion(req);
      const resultado = await servicios.auth.iniciarSesion(bodyCampos(req, ['rut', 'password']));
      await guardarSesionNueva(req, resultado.usuario.rut);
      return responder(res, resultado, 200, 'Sesión iniciada.');
    }),
    // Sin body. Idempotente para una sesión ya vacía.
    cerrarSesion: accion(async (req, res) => {
      exigirMiddlewareSesion(req);
      await operacionSesion(req, 'destroy');
      res.clearCookie(nombreCookie, cookieAlSalir);
      res.set('Cache-Control', 'no-store');
      return res.status(204).end();
    }),
    // Body: password_actual, password, confirmacion_password.
    cambiarPassword: accion(async (req, res) => {
      exigirMiddlewareSesion(req);
      const ctx = contexto(req);
      const resultado = await servicios.auth.cambiarPassword(ctx,
        bodyCampos(req, ['password_actual', 'password', 'confirmacion_password']));
      await guardarSesionNueva(req, ctx.rut);
      return responder(res, resultado, 200, 'Contraseña actualizada.');
    }),
    // Params: rut. Body: password, confirmacion_password, identidad_verificada.
    // Exclusivo de Administrador; el servicio comprueba su rol en BD.
    habilitarCuentaExistente: accion(async (req, res) => responder(res,
      await servicios.auth.habilitarCuentaExistente(contexto(req), parametro(req, 'rut'),
        bodyCampos(req, ['password', 'confirmacion_password', 'identidad_verificada'])),
      200, 'Cuenta habilitada.'))
  };
  return auth;
}
module.exports = crearAuthController;
