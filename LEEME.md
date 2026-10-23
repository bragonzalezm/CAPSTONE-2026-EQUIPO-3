# Nicolett Studio Fantasy — interfaz de reservas

## Actualizar tu proyecto

1. Copia las carpetas `frontend` y `backend` sobre tu proyecto. Conserva tu `.env` actual (el ZIP no contiene uno).
2. Si ya cargaste tu SQL con podología, especialistas y disponibilidad, no ejecutes más SQL. Si usas los datos demo anteriores, ejecuta `backend/scripts/03_podologia_demo.sql` una vez.
3. En `backend`: `npm install`, luego `npm start`. Si el servidor estaba abierto, detenlo con Ctrl+C y reinícialo.
4. Abre http://localhost:3000 y actualiza con Ctrl+F5.

## Recorrido

Carrusel → Podología clínica → día y hora con especialista → datos → confirmación e indicaciones → abono simulado de $5.000 → comprobante.

- Los demás servicios están visibles, pero deshabilitados para centrar la demostración en podología.
- Los días, especialistas y horarios vienen de tu PostgreSQL. No se usan IDs fijos.
- La duración sigue siendo 60 minutos. Los bloques 10:00–11:45, 12:00–13:45, 15:00–16:45 y 17:00–18:45 ofrecen las cuatro horas de inicio.
- `dia_semana`: 0=domingo, 1=lunes, …, 6=sábado. Hora local America/Santiago, agenda de 90 días.
- El pago es explícitamente simulado: no pide tarjeta ni cobra dinero. Al aceptar, guarda reserva e indicaciones junto con un registro de $5.000 en PAGO, estado `simulado`, dentro de la misma transacción.
- Reintentar la misma operación no crea otro pago. Un horario ocupado devuelve un conflicto y vuelve al calendario.
- No se envían correos automáticos ni se integra Webpay/Google Calendar.
- Administración conserva la clave `ADMIN_KEY` del `.env`. Distingue pagos simulados de pagos manuales reales.
- Los contactos y colores provienen de las referencias proporcionadas. Las fotografías de los servicios se muestran mediante encuadres CSS de esas referencias; las profesionales usan siluetas genéricas.
- El servidor sigue escuchando solo en 127.0.0.1, para demostración local.

## Base desde cero

Crea la base `nicolett`. Ejecuta `01_estructura.sql` únicamente sobre una base vacía. Luego carga tus datos o `02_datos_demo.sql` y `03_podologia_demo.sql`. Copia `.env.example` como `.env` y configura la conexión y ADMIN_KEY.

## Prueba rápida

RUN ficticio válido: `12.345.678-5`. Teléfono: `912345678`. Correo: `demo@example.com`.
Selecciona un día de lunes a sábado que tenga horas futuras.
`npm test` ejecuta las pruebas de validación.

## Verificación

Probado en Chromium a 1440 y 390 píxeles: carrusel, selección de día/profesional/hora, datos, indicaciones, cancelación del diálogo, pago simulado, comprobante y administración. SQL y API comprobados con PostgreSQL embebido (PGlite), incluyendo carga repetible, conflictos de horario y reintentos sin duplicar pago/reserva. También pasan las cuatro pruebas de validación.
