const path = require('node:path');
const { google } = require('googleapis');

require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

async function probarConexion() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    throw new Error('Falta GOOGLE_CALENDAR_ID en backend/.env');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(
      __dirname,
      '../credentials/google-calendar.json'
    ),
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  const calendar = google.calendar({ version: 'v3', auth });

  const { data } = await calendar.calendars.get({ calendarId });

  console.log('Conexión con Google Calendar correcta.');
  console.log('Calendario:', data.summary);
  console.log('Zona horaria:', data.timeZone);

    // Evento de prueba: comienza dentro de una hora y dura 30 minutos.
  const inicio = new Date(Date.now() + 60 * 60 * 1000);
  const fin = new Date(inicio.getTime() + 30 * 60 * 1000);

  const { data: evento } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: 'PRUEBA — Nicolett',
      description: 'Evento de prueba creado desde el backend. Puedes eliminarlo.',
      start: {
        dateTime: inicio.toISOString(),
        timeZone: 'America/Santiago'
      },
      end: {
        dateTime: fin.toISOString(),
        timeZone: 'America/Santiago'
      },
      reminders: {
        useDefault: false
      }
    }
  });

  console.log('Evento creado correctamente.');
  console.log('Ver evento:', evento.htmlLink);

}

probarConexion().catch(error => {
  console.error('Error de conexión:', error.message);
  process.exitCode = 1;
});