import pool from '../config/db.js';
export async function listarEspecialidades() {
  return (await pool.query('SELECT id,nombre,descripcion FROM "ESPECIALIDAD" ORDER BY nombre')).rows;
}
export async function buscarEspecialidadPorId(id) {
  return (await pool.query('SELECT id,nombre,descripcion FROM "ESPECIALIDAD" WHERE id=$1',[id])).rows[0] ?? null;
}
