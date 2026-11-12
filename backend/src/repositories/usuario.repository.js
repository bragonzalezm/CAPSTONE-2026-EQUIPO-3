'use strict';

function crearUsuarioRepository(dependencias) {
  const { columnasUsuario, db, exigirTransaccion, paginacion, uno, varios } = dependencias;
  const usuarios = {
    buscarPorRut(rut) {
      return uno(`SELECT ${columnasUsuario} FROM usuario WHERE rut = $1`, [rut]);
    },
    // Solo lo debe utilizar el servicio de autenticación. Nunca devolver al front.
    buscarParaAutenticacion(rut) {
      return uno(`SELECT ${columnasUsuario}, password FROM usuario WHERE rut = $1`, [rut]);
    },
    buscarFichaPorRut(rut) {
      return uno(`SELECT ${columnasUsuario}, precauciones FROM usuario WHERE rut = $1`, [rut]);
    },
    listar({ busqueda = '', limite = 50, desplazamiento = 0 } = {}) {
      const [l, d] = paginacion(limite, desplazamiento);
      return varios(`SELECT ${columnasUsuario} FROM usuario
        WHERE rut ILIKE $1 OR nombres ILIKE $1 OR apellidos ILIKE $1
        ORDER BY apellidos, nombres, rut LIMIT $2 OFFSET $3`, [`%${busqueda}%`, l, d]);
    },
    crear({ rut, nombres, apellidos, telefono, correo = null, password = null }) {
      return uno(`INSERT INTO usuario (rut, nombres, apellidos, telefono, correo, password)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${columnasUsuario}`,
      [rut, nombres, apellidos, telefono, correo, password]);
    },
    // Si ya existe, NO cambia sus contactos, contraseña ni precauciones.
    // Devuelve solo RUT: no filtra información de otra ficha al invitado.
    async asegurarInvitado({ rut, nombres, apellidos, telefono, correo = null }) {
      exigirTransaccion();
      await db.query(`INSERT INTO usuario (rut, nombres, apellidos, telefono, correo)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (rut) DO NOTHING`,
      [rut, nombres, apellidos, telefono, correo]);
      return uno('SELECT rut FROM usuario WHERE rut = $1', [rut]);
    },
    // Invocar SOLO tras verificar que quien registra la cuenta es su titular.
    habilitarCuenta(rut, passwordHash) {
      exigirTransaccion();
      return uno(`UPDATE usuario SET password = $2
        WHERE rut = $1 AND password IS NULL AND $2::text IS NOT NULL
          AND length($2::text) > 0 RETURNING ${columnasUsuario}`, [rut, passwordHash]);
    },
    actualizarDatos(rut, { nombres, apellidos, telefono, correo = null }) {
      return uno(`UPDATE usuario SET nombres=$2, apellidos=$3, telefono=$4, correo=$5
        WHERE rut=$1 RETURNING ${columnasUsuario}`, [rut, nombres, apellidos, telefono, correo]);
    },
    actualizarPassword(rut, passwordHash) {
      return uno(`UPDATE usuario SET password=$2 WHERE rut=$1 AND password IS NOT NULL
        AND $2::text IS NOT NULL AND length($2::text)>0 RETURNING rut`, [rut, passwordHash]);
    },
    actualizarPrecauciones(rut, precauciones) {
      return uno('UPDATE usuario SET precauciones=$2 WHERE rut=$1 RETURNING rut, precauciones',
        [rut, precauciones]);
    }
  };
  return usuarios;
}
module.exports = crearUsuarioRepository;
