'use strict';

function crearRolRepository(dependencias) {
  const { exigirTransaccion, uno, varios } = dependencias;
  const roles = {
    listarPorUsuario(rut) {
      return varios(`SELECT r.id_rol, r.nombre FROM rol r JOIN usuario_rol ur USING(id_rol)
        WHERE ur.rut=$1 ORDER BY r.id_rol`, [rut]);
    },
    asignar(rut, idRol) {
      exigirTransaccion();
      return uno(`INSERT INTO usuario_rol(rut,id_rol) VALUES($1,$2)
        ON CONFLICT DO NOTHING RETURNING rut,id_rol`, [rut, idRol]);
    },
    retirar(rut, idRol) {
      exigirTransaccion();
      return uno('DELETE FROM usuario_rol WHERE rut=$1 AND id_rol=$2 RETURNING rut,id_rol', [rut, idRol]);
    },
    async contarAdministradores() {
      const fila = await uno(`SELECT count(*)::integer AS total FROM usuario_rol ur
        JOIN rol r USING(id_rol) JOIN usuario u USING(rut)
        WHERE upper(r.nombre)='ADMINISTRADOR' AND u.password IS NOT NULL`);
      return fila.total;
    },
    // El servicio deberá tomar este bloqueo ANTES de comprobar/retirar admins.
    bloquearAdministracion() {
      exigirTransaccion();
      return uno("SELECT id_rol FROM rol WHERE upper(nombre)='ADMINISTRADOR' FOR UPDATE");
    }
  };
  return roles;
}
module.exports = crearRolRepository;
