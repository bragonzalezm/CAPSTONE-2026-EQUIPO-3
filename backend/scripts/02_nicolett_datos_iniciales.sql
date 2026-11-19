-- Nicolett | Datos iniciales
-- Ejecutar después de 01_nicolett_estructura.sql.
-- Carga las especialidades y los catálogos que utiliza el backend.

BEGIN;

SET LOCAL search_path TO public;

INSERT INTO especialidad (nombre, activa) VALUES
  ('Podología', true),
  ('Peluquería', true),
  ('Manicure', true),
  ('Pedicure', true),
  ('Pestañas', true),
  ('Depilación', true),
  ('Cejas', true)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO rol (id_rol, nombre) VALUES
  (1, 'ADMINISTRADOR'),
  (2, 'ESPECIALISTA'),
  (3, 'CLIENTE')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipo_precio (id_tipo_precio, nombre) VALUES
  (1, 'FIJO'),
  (2, 'DESDE')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO dia_semana (id_dia, nombre) VALUES
  (1, 'Lunes'),
  (2, 'Martes'),
  (3, 'Miércoles'),
  (4, 'Jueves'),
  (5, 'Viernes'),
  (6, 'Sábado'),
  (7, 'Domingo')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO origen_reserva (id_origen, nombre) VALUES
  (1, 'WEB'),
  (2, 'PERSONAL')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO estado_reserva (id_estado, nombre) VALUES
  (1, 'PENDIENTE'),
  (2, 'CONFIRMADA'),
  (3, 'CANCELADA'),
  (4, 'REALIZADA')
ON CONFLICT (nombre) DO NOTHING;

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

COMMIT;
