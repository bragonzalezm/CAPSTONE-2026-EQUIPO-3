-- NICOLETT: datos iniciales para el modelo simplificado con tabla usuario.
-- Ejecutar en la misma base de datos y esquema que usa el backend.
-- No es compatible con el modelo antiguo persona/cuenta.
-- No crea tablas ni modifica registros existentes.
-- Si hay una colisión de nombres/IDs, toda la transacción se revierte.

BEGIN;

-- 01. Roles
INSERT INTO rol (id_rol, nombre) VALUES
  (1, 'ADMINISTRADOR'),
  (2, 'ESPECIALISTA'),
  (3, 'CLIENTE')
ON CONFLICT (nombre) DO NOTHING;

-- 02. Tipos de precio del catálogo
INSERT INTO tipo_precio (id_tipo_precio, nombre) VALUES
  (1, 'FIJO'),
  (2, 'DESDE')
ON CONFLICT (nombre) DO NOTHING;

-- 03. Días: lunes=1, domingo=7
INSERT INTO dia_semana (id_dia, nombre) VALUES
  (1, 'Lunes'),
  (2, 'Martes'),
  (3, 'Miércoles'),
  (4, 'Jueves'),
  (5, 'Viernes'),
  (6, 'Sábado'),
  (7, 'Domingo')
ON CONFLICT (nombre) DO NOTHING;

-- 04. Origen: el backend utiliza exactamente WEB y PERSONAL.
INSERT INTO origen_reserva (id_origen, nombre) VALUES
  (1, 'WEB'),
  (2, 'PERSONAL')
ON CONFLICT (nombre) DO NOTHING;

-- 05. Estados utilizados por los servicios
-- PENDIENTE permite retener temporalmente una hora mientras se procesa el pago.
-- No significa que se haya registrado un pago rechazado en la tabla pago.
INSERT INTO estado_reserva (id_estado, nombre) VALUES
  (1, 'PENDIENTE'),
  (2, 'CONFIRMADA'),
  (3, 'CANCELADA'),
  (4, 'REALIZADA')
ON CONFLICT (nombre) DO NOTHING;

-- 06. Medios de pago
-- WEBPAY debe tener ID 1 por el CHECK de la tabla pago.
-- Sin abono = sin fila en pago; no se agrega EXENTO ni monto cero.
INSERT INTO medio_pago (id_medio, nombre) VALUES
  (1, 'WEBPAY'),
  (2, 'EFECTIVO'),
  (3, 'TRANSFERENCIA'),
  (4, 'POS_LOCAL')
ON CONFLICT (nombre) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM medio_pago WHERE id_medio = 1 AND nombre = 'WEBPAY'
  ) THEN
    RAISE EXCEPTION 'WEBPAY debe tener id_medio = 1. Revisa el catálogo existente.';
  END IF;
END;
$$;

-- 07. Especialidad para comenzar con el flujo de podología acordado.
-- Su ID lo genera PostgreSQL: no se fuerza ni se reinicia la secuencia.
INSERT INTO especialidad (nombre, activa) VALUES
  ('Podología', true)
ON CONFLICT (nombre) DO NOTHING;

COMMIT;

-- 08. Comprobación
SELECT * FROM rol ORDER BY id_rol;
SELECT * FROM tipo_precio ORDER BY id_tipo_precio;
SELECT * FROM dia_semana ORDER BY id_dia;
SELECT * FROM origen_reserva ORDER BY id_origen;
SELECT * FROM estado_reserva ORDER BY id_estado;
SELECT * FROM medio_pago ORDER BY id_medio;
SELECT * FROM especialidad ORDER BY id_especialidad;

-- SIGUIENTE PASO:
-- Crear la primera cuenta con el servicio de registro para generar el hash.
-- Después asignar Administrador a esa cuenta mediante SQL, usando su RUT.
-- No guardar una contraseña en texto plano ni inventar un hash en usuario.password.
-- Los especialistas también requieren cuenta, rol ESPECIALISTA, especialidad
-- asignada y horarios para aparecer disponibles en la agenda.
-- Servicios/precios, anuncios, usuarios y horarios se cargarán con los datos
-- acordados; este script no inventa precios ni reservas/pagos/atenciones.
