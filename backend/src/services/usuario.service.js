'use strict';

const crearGoogleCalendarService = require('./google-calendar.service.js');

function crearUsuarioService(dependencias) {
  const { actor, administrador, contacto, especialistaHabilitada, fallar, pagina,
    personal, repository, requerido, rutValido, texto } = dependencias;
  const googleCalendar = crearGoogleCalendarService(repository);
  const usuarios = {
    async verMiPerfil(ctx) {
      const { rut } = await actor(ctx);
      const [usuario, roles] = await Promise.all([
        repository.usuarios.buscarPorRut(rut),
        repository.roles.listarPorUsuario(rut)
      ]);
      return { ...requerido(usuario), roles };
    },
    async actualizarMiPerfil(ctx, d) {
      const a = await actor(ctx); return requerido(await repository.usuarios.actualizarDatos(a.rut, contacto(d, true)));
    },
    async listar(ctx, filtros = {}) {
      await administrador(ctx);
      return repository.usuarios.listar({ ...pagina(filtros), busqueda: texto(filtros.busqueda, 'busqueda', 100, true) });
    },
    async verConfiguracion(ctx, rut) {
      await administrador(ctx);
      const normalizado = rutValido(rut);
      const usuario = requerido(await repository.usuarios.buscarParaAutenticacion(normalizado));
      const [roles, especialidades, rolesDisponibles, especialidadesDisponibles, calendario] =
        await Promise.all([
          repository.roles.listarPorUsuario(normalizado),
          repository.especialidades.listarPorUsuario(normalizado),
          repository.catalogos.listar('rol'),
          repository.especialidades.listar(),
          repository.reservas.buscarCalendarioGoogle(normalizado)
        ]);
      return {
        usuario: { rut: usuario.rut, nombres: usuario.nombres, apellidos: usuario.apellidos },
        cuenta_habilitada: Boolean(usuario.password),
        roles,
        especialidades,
        roles_disponibles: rolesDisponibles,
        especialidades_disponibles: especialidadesDisponibles,
        id_calendario_google: calendario?.id_calendario_google ?? ''
      };
    },
    async guardarCalendario(ctx, rut, idCalendario) {
      await administrador(ctx);
      const normalizado = rutValido(rut);
      const calendarId = texto(idCalendario, 'ID del calendario', 255);
      if (!/^[^\s@]+@[^\s@]+$/.test(calendarId)) {
        fallar('CALENDARIO_INVALIDO', 'Copia el ID completo desde Integrar el calendario en Google Calendar.');
      }
      await especialistaHabilitada(repository, normalizado);

      let permiteEditar;
      try {
        permiteEditar = await googleCalendar.permiteEditar(calendarId);
      } catch (error) {
        const status = Number(error.response?.status ?? error.code);
        if (status === 404 || status === 403) {
          fallar('CALENDARIO_SIN_ACCESO', 'Revisa el ID y comparte el calendario con la cuenta de servicio.', 409);
        }
        fallar('INTEGRACION_PENDIENTE', 'No se pudo verificar el calendario. Revisa la conexión y la credencial de Google Calendar.', 502);
      }
      if (!permiteEditar) {
        fallar('CALENDARIO_SIN_EDICION', 'Dale permiso para hacer cambios en eventos a la cuenta de servicio.', 409);
      }

      let guardado;
      try {
        guardado = await repository.conTransaccion(async tx => {
          await administrador(ctx, tx);
          await tx.reservas.bloquearEspecialista(normalizado);
          await especialistaHabilitada(tx, normalizado);
          const anterior = await tx.reservas.buscarCalendarioGoogle(normalizado);
          if (anterior && anterior.id_calendario_google !== calendarId &&
              await tx.reservas.buscarReservaConEventoGoogle(normalizado)) {
            fallar('CALENDARIO_CON_RESERVAS', 'Hay reservas vinculadas a este calendario. Traslada sus eventos antes de cambiarlo.', 409);
          }
          return tx.reservas.guardarCalendarioGoogle(normalizado, calendarId);
        });
      } catch (error) {
        if (error.code === '23505') {
          fallar('CALENDARIO_YA_ASIGNADO', 'Ese calendario ya está asignado a otra especialista.', 409);
        }
        throw error;
      }

      // Publicar la disponibilidad en segundo plano una vez confirmada la asignación.
      void googleCalendar.sincronizarDisponibilidad(normalizado).catch(error => {
        console.error(`Google Calendar pendiente para ${normalizado}:`, error.message);
      });
      return guardado;
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
