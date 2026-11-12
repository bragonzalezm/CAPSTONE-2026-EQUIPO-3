'use strict';

function crearServicioRepository(dependencias) {
  const { uno, varios } = dependencias;
  const servicios = {
    listar({ idEspecialidad = null, soloActivos = true } = {}) {
      return varios(`SELECT s.*, e.nombre AS especialidad, tp.nombre AS tipo_precio
        FROM servicio s JOIN especialidad e USING(id_especialidad)
        JOIN tipo_precio tp USING(id_tipo_precio)
        WHERE ($1::bigint IS NULL OR s.id_especialidad=$1)
          AND ($2::boolean=false OR (s.activo AND e.activa)) ORDER BY e.nombre,s.nombre,s.id_servicio`,
      [idEspecialidad, soloActivos]);
    },
    buscarPorId(id) { return uno('SELECT * FROM servicio WHERE id_servicio=$1', [id]); },
    crear({ id_especialidad, id_tipo_precio, nombre, descripcion = '', precio, precio_oferta = null }) {
      return uno(`INSERT INTO servicio(id_especialidad,id_tipo_precio,nombre,descripcion,precio,precio_oferta)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id_especialidad, id_tipo_precio, nombre, descripcion, precio, precio_oferta]);
    },
    actualizar(id, { id_especialidad, id_tipo_precio, nombre, descripcion = '', precio, precio_oferta = null, activo }) {
      return uno(`UPDATE servicio SET id_especialidad=$2,id_tipo_precio=$3,nombre=$4,
        descripcion=$5,precio=$6,precio_oferta=$7,activo=$8 WHERE id_servicio=$1 RETURNING *`,
      [id, id_especialidad, id_tipo_precio, nombre, descripcion, precio, precio_oferta, activo]);
    },
    cambiarActivo(id, activo) {
      return uno('UPDATE servicio SET activo=$2 WHERE id_servicio=$1 RETURNING *', [id, activo]);
    }
  };
  return servicios;
}
module.exports = crearServicioRepository;
