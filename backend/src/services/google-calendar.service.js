'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { google } = require('googleapis');

function crearGoogleCalendarService(repository) {
  let calendar;

  function obtenerCliente() {
    if (!calendar) {
      const archivo = path.join(__dirname, '../../credentials/google-calendar.json');
      const credenciales = JSON.parse(fs.readFileSync(archivo, 'utf8'));
      const auth = new google.auth.JWT({
        email: credenciales.client_email,
        key: credenciales.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar.events']
      });
      calendar = google.calendar({ version: 'v3', auth });
    }
    return calendar;
  }

  function codigoHTTP(error) {
    return Number(error.response?.status ?? error.code);
  }

  async function permiteEditar(calendarId) {
    const { data } = await obtenerCliente().events.list({
      calendarId, maxResults: 1, fields: 'accessRole'
    }, { timeout: 10000, retry: false });
    return ['owner', 'writer', 'writerWithoutPrivateAccess'].includes(data.accessRole);
  }

  async function sincronizar(idReserva) {
    let rutReserva, fechaReserva;
    const resultado = await repository.conTransaccion(async tx => {
      // Consultar el estado actual bajo el mismo bloqueo que usa la agenda.
      await tx.reservas.bloquearPorId(idReserva);
      const r = await tx.reservas.buscarPorId(idReserva);
      if (!r) return 'NO_APLICA';
      rutReserva = r.rut_especialista;
      fechaReserva = fechaChile(r.fecha_hora_inicio);

      const configuracion = await tx.reservas.buscarCalendarioGoogle(
        r.rut_especialista
      );

      if (!configuracion) {
        throw new Error(
          `La especialista ${r.rut_especialista} no tiene calendario configurado.`
        );
      }

      const calendarId = configuracion.id_calendario_google;

      const estado = String(r.estado).toUpperCase();
      if (!['CONFIRMADA', 'REALIZADA', 'CANCELADA'].includes(estado)) {
        return 'NO_APLICA';
      }

      const cliente = obtenerCliente();
      // El mismo ID permite reintentar sin duplicar la reserva en Google.
      const eventId = r.id_evento_google || createHash('sha256')
        .update(`${calendarId}:${r.id_reserva}`).digest('hex');
      const parametros = { calendarId, eventId };
      const opciones = { timeout: 10000, retry: false };

      if (estado === 'CANCELADA') {
        try {
          await cliente.events.delete(parametros, opciones);
        } catch (error) {
          if (![404, 410].includes(codigoHTTP(error))) throw error;
        }
        await tx.reservas.actualizarEventoGoogle(idReserva, null);
        return 'SINCRONIZADA';
      }

      const requestBody = {
        summary: `[${r.especialidad}] ${r.nombres_cliente} ${r.apellidos_cliente}`,
        description: [
          `Reserva: #${r.id_reserva}`,
          `RUT: ${r.rut_cliente}`,
          `Telefono: ${r.telefono_cliente || ''}`,
          `Especialista: ${r.nombres_especialista} ${r.apellidos_especialista}`,
          `Especialidad: ${r.especialidad}`
        ].join('\n'),
        start: {
          dateTime: new Date(r.fecha_hora_inicio).toISOString(),
          timeZone: 'America/Santiago'
        },
        end: {
          dateTime: new Date(r.fecha_hora_fin).toISOString(),
          timeZone: 'America/Santiago'
        },
        reminders: { useDefault: false }
      };

      try {
        await cliente.events.insert({
          calendarId, requestBody: { ...requestBody, id: eventId }
        }, opciones);
      } catch (error) {
        if (codigoHTTP(error) !== 409) throw error;
        await cliente.events.patch({ ...parametros, requestBody }, opciones);
      }

      await tx.reservas.actualizarEventoGoogle(idReserva, eventId);
      return 'SINCRONIZADA';
    });
    if (resultado === 'SINCRONIZADA') {
      await sincronizarDisponibilidad(rutReserva, fechaReserva, fechaReserva);
    }
    return resultado;
  }

  function fechaChile(valor) {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(valor)).map(p => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day}`;
  }

  function sumarDias(fecha, dias) {
    const valor = new Date(`${fecha}T12:00:00Z`);
    valor.setUTCDate(valor.getUTCDate() + dias);
    return valor.toISOString().slice(0, 10);
  }

  async function sincronizarDisponibilidad(rut, desde = fechaChile(new Date()), hasta = sumarDias(desde, 27)) {
    const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) ||
        !Number.isFinite(dias) || dias < 0 || dias > 27) {
      throw new Error('La disponibilidad de Google se publica en rangos de hasta 28 dias.');
    }
    return repository.conTransaccion(async tx => {
      await tx.reservas.bloquearEspecialista(rut);
      const configuracion = await tx.reservas.buscarCalendarioGoogle(rut);
      // Las trabajadoras sin integracion mantienen su agenda en Nicolett.
      if (!configuracion) return 'NO_APLICA';
      const calendarId = configuracion.id_calendario_google;
      const cliente = obtenerCliente();
      const opciones = { timeout: 10000, retry: false };
      const limites = await tx.horarios.limitesLocales(desde, hasta);
      const bloques = await tx.horarios.listarBloques({ rutEspecialista: rut, desde, hasta });
      const deseados = new Map();
      for (const bloque of bloques) {
        if (!bloque.disponible || bloque.bloqueado || new Date(bloque.inicio) <= new Date()) continue;
        const inicio = new Date(bloque.inicio).toISOString();
        const fin = new Date(bloque.fin).toISOString();
        const clave = createHash('sha256').update(`${rut}:${inicio}:${fin}`).digest('hex');
        deseados.set(clave, { summary: 'DISPONIBLE',
          description: 'Hora disponible. Las reservas se gestionan desde Nicolett.',
          start: { dateTime: inicio, timeZone: 'America/Santiago' },
          end: { dateTime: fin, timeZone: 'America/Santiago' },
          // Disponible visualmente sin marcar ocupada la agenda personal.
          transparency: 'transparent', reminders: { useDefault: false },
          extendedProperties: { private: { nicolett_tipo: 'disponible',
            nicolett_especialista: rut, nicolett_bloque: clave } }
        });
      }

      const existentes = [];
      let pageToken;
      do {
        const { data } = await cliente.events.list({ calendarId,
          timeMin: new Date(limites.inicio).toISOString(),
          timeMax: new Date(limites.fin).toISOString(),
          privateExtendedProperty: ['nicolett_tipo=disponible', `nicolett_especialista=${rut}`],
          showDeleted: false, maxResults: 2500, pageToken
        }, opciones);
        existentes.push(...(data.items || []));
        pageToken = data.nextPageToken;
      } while (pageToken);

      for (const evento of existentes) {
        const propiedades = evento.extendedProperties?.private;
        // Nunca modificar reservas ni eventos personales ajenos a esta funcion.
        if (propiedades?.nicolett_tipo !== 'disponible' || propiedades.nicolett_especialista !== rut) continue;
        const cuerpo = deseados.get(propiedades.nicolett_bloque);
        if (!cuerpo) {
          try { await cliente.events.delete({ calendarId, eventId: evento.id }, opciones); }
          catch (error) { if (![404, 410].includes(codigoHTTP(error))) throw error; }
          continue;
        }
        if (evento.summary !== cuerpo.summary || evento.transparency !== 'transparent' ||
            Date.parse(evento.start?.dateTime) !== Date.parse(cuerpo.start.dateTime) ||
            Date.parse(evento.end?.dateTime) !== Date.parse(cuerpo.end.dateTime)) {
          await cliente.events.patch({ calendarId, eventId: evento.id, requestBody: cuerpo }, opciones);
        }
        deseados.delete(propiedades.nicolett_bloque);
      }
      for (const cuerpo of deseados.values()) {
        // ID nuevo para poder reabrir un bloque cuyo evento anterior fue eliminado.
        await cliente.events.insert({ calendarId,
          requestBody: { ...cuerpo, id: randomUUID().replace(/-/g, '') }
        }, opciones);
      }
      return 'SINCRONIZADA';
    });
  }

  return { permiteEditar, sincronizar, sincronizarDisponibilidad };
}

module.exports = crearGoogleCalendarService;
