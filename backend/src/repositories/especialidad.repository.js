'use strict';

function crearEspecialidadRepository(dependencias) {
  const { exigirTransaccion, uno, varios } = dependencias;
  const especialidades = {
    listar({ soloActivas = true } = {}) {
      return varios('SELECT * FROM especialidad WHERE ($1::boolean=false OR activa) ORDER BY nombre', [soloActivas]);
    },
    buscarPorId(id) { return uno('SELECT * FROM especialidad WHERE id_especialidad=$1', [id]); },
    crear(nombre) {
      return uno('INSERT INTO especialidad(nombre) VALUES($1) RETURNING *', [nombre]);
    },
    actualizar(id, { nombre, activa }) {
      return uno('UPDATE especialidad SET nombre=$2, activa=$3 WHERE id_especialidad=$1 RETURNING *', [id, nombre, activa]);
    },
    listarPorUsuario(rut) {
      return varios(`SELECT e.* FROM especialidad e JOIN usuario_especialidad ue USING(id_especialidad)
        WHERE ue.rut=$1 ORDER BY e.nombre`, [rut]);
    },
    asignar(rut, idEspecialidad) {
      exigirTransaccion();
      return uno(`INSERT INTO usuario_especialidad(rut,id_especialidad) VALUES($1,$2)
        ON CONFLICT DO NOTHING RETURNING *`, [rut, idEspecialidad]);
    },
    // La FK rechaza quitar una asignación utilizada por reservas históricas.
    // Para retirar acceso laboral, retirar el rol; no borrar sus antecedentes.
    retirarAsignacion(rut, idEspecialidad) {
      exigirTransaccion();
      return uno(`DELETE FROM usuario_especialidad WHERE rut=$1 AND id_especialidad=$2 RETURNING *`, [rut, idEspecialidad]);
    },
    listarEspecialistas(idEspecialidad) {
      return varios(`SELECT u.rut, u.nombres, u.apellidos FROM usuario u
        JOIN usuario_especialidad ue ON ue.rut=u.rut
        JOIN especialidad e USING(id_especialidad)
        WHERE ue.id_especialidad=$1 AND e.activa AND u.password IS NOT NULL
        AND EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol ro USING(id_rol)
          WHERE ur.rut=u.rut AND upper(ro.nombre)='ESPECIALISTA')
        ORDER BY u.nombres,u.apellidos,u.rut`, [idEspecialidad]);
    }
  };
  return especialidades;
}
module.exports = crearEspecialidadRepository;
