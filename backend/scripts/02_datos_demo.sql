-- Ejecutar sobre nicolett. Datos ficticios. Repetible sin duplicar los datos demo.
BEGIN;
INSERT INTO "ROL" (nombre, descripcion)
SELECT 'Especialista', 'Profesional del estudio' WHERE NOT EXISTS (SELECT 1 FROM "ROL" WHERE nombre='Especialista');
INSERT INTO "ESPECIALIDAD" (nombre, descripcion)
SELECT 'Manicure', 'Sesión de manicure de 60 minutos' WHERE NOT EXISTS (SELECT 1 FROM "ESPECIALIDAD" WHERE nombre='Manicure');
INSERT INTO "ESPECIALIDAD" (nombre, descripcion)
SELECT 'Pestañas', 'Sesión de pestañas de 60 minutos' WHERE NOT EXISTS (SELECT 1 FROM "ESPECIALIDAD" WHERE nombre='Pestañas');
INSERT INTO "ESPECIALIDAD" (nombre, descripcion)
SELECT 'Cejas', 'Sesión de cejas de 60 minutos' WHERE NOT EXISTS (SELECT 1 FROM "ESPECIALIDAD" WHERE nombre='Cejas');
INSERT INTO "ESPECIALISTA" (correo_electronico,nombres,ap_paterno,ap_materno,id_rol)
VALUES ('nicole.demo@example.com','Nicole','Demo','',(SELECT MIN(id) FROM "ROL" WHERE nombre='Especialista')),
('camila.demo@example.com','Camila','Demo','',(SELECT MIN(id) FROM "ROL" WHERE nombre='Especialista'))
ON CONFLICT (correo_electronico) DO NOTHING;
INSERT INTO "ESPECIALISTA_ESPECIALIDAD" (id_especialista,id_especialidad)
SELECT e.id,s.id FROM "ESPECIALISTA" e CROSS JOIN "ESPECIALIDAD" s
WHERE e.correo_electronico IN ('nicole.demo@example.com','camila.demo@example.com') AND s.nombre IN ('Manicure','Pestañas','Cejas')
ON CONFLICT DO NOTHING;
-- dia_semana: 0=domingo, 1=lunes ... 6=sábado. Atención lunes a sábado, 09:00–18:00.
INSERT INTO "DISPONIBILIDAD" (id_especialista,dia_semana,hora_inicio,hora_fin)
SELECT e.id,d,'09:00'::time,'18:00'::time FROM "ESPECIALISTA" e CROSS JOIN generate_series(1,6) d
WHERE e.correo_electronico IN ('nicole.demo@example.com','camila.demo@example.com')
AND NOT EXISTS (SELECT 1 FROM "DISPONIBILIDAD" a WHERE a.id_especialista=e.id AND a.dia_semana=d);
CREATE INDEX IF NOT EXISTS idx_reserva_agenda ON "RESERVA" (id_especialista,fecha_inicio,fecha_fin);
COMMIT;
