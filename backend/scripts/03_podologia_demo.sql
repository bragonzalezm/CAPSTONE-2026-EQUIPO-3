-- OPCIONAL: si ya cargaste tu SQL con podología y sus profesionales, no necesitas este archivo.
-- Solo agrega el camino de podología cuando no existe ningún profesional vinculado.
BEGIN;
DO $$
DECLARE servicio integer; rol integer;
BEGIN
 SELECT id INTO servicio FROM "ESPECIALIDAD" WHERE lower(nombre) LIKE '%podolog%' ORDER BY id LIMIT 1;
 IF servicio IS NULL THEN
  INSERT INTO "ESPECIALIDAD" (nombre,descripcion) VALUES ('Podologia clinica','Cuidado integral de la salud de tus pies') RETURNING id INTO servicio;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "ESPECIALISTA_ESPECIALIDAD" WHERE id_especialidad=servicio) THEN
  SELECT id INTO rol FROM "ROL" WHERE nombre IN ('Trabajador','Especialista') ORDER BY id LIMIT 1;
  IF rol IS NULL THEN INSERT INTO "ROL" (nombre,descripcion) VALUES ('Trabajador','Especialista del estudio') RETURNING id INTO rol; END IF;
  INSERT INTO "ESPECIALISTA" (correo_electronico,nombres,ap_paterno,ap_materno,id_rol) VALUES
   ('juana.demo@example.com','Juana','Dearco','Madero',rol),('helena.demo@example.com','Helena','Famous','Monsters',rol)
  ON CONFLICT(correo_electronico) DO NOTHING;
  INSERT INTO "ESPECIALISTA_ESPECIALIDAD" (id_especialista,id_especialidad)
  SELECT id,servicio FROM "ESPECIALISTA" WHERE correo_electronico IN ('juana.demo@example.com','helena.demo@example.com') ON CONFLICT DO NOTHING;
  INSERT INTO "DISPONIBILIDAD" (id_especialista,dia_semana,hora_inicio,hora_fin)
  SELECT e.id,d,h.inicio,h.fin FROM "ESPECIALISTA" e CROSS JOIN generate_series(1,6) d CROSS JOIN
   (VALUES ('10:00'::time,'11:45'::time),('12:00'::time,'13:45'::time),('15:00'::time,'16:45'::time),('17:00'::time,'18:45'::time)) h(inicio,fin)
  WHERE e.correo_electronico IN ('juana.demo@example.com','helena.demo@example.com')
  AND NOT EXISTS(SELECT 1 FROM "DISPONIBILIDAD" a WHERE a.id_especialista=e.id AND a.dia_semana=d AND a.hora_inicio=h.inicio);
 END IF;
END $$;
COMMIT;
