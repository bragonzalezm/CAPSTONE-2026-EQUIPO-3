'use strict';

function crearAnuncioRepository(dependencias) {
  const { uno, varios } = dependencias;
  const anuncios = {
    listar({ soloActivos = true } = {}) {
      return varios('SELECT * FROM anuncio WHERE ($1::boolean=false OR activo) ORDER BY orden,id_anuncio', [soloActivos]);
    },
    buscarPorId(id) { return uno('SELECT * FROM anuncio WHERE id_anuncio=$1', [id]); },
    crear({ titulo, contenido, imagen_url = null, orden = 0 }) {
      return uno(`INSERT INTO anuncio(titulo,contenido,imagen_url,orden) VALUES($1,$2,$3,$4) RETURNING *`,
        [titulo, contenido, imagen_url, orden]);
    },
    actualizar(id, { titulo, contenido, imagen_url = null, orden = 0, activo }) {
      return uno(`UPDATE anuncio SET titulo=$2,contenido=$3,imagen_url=$4,orden=$5,activo=$6
        WHERE id_anuncio=$1 RETURNING *`, [id, titulo, contenido, imagen_url, orden, activo]);
    },
    eliminar(id) { return uno('DELETE FROM anuncio WHERE id_anuncio=$1 RETURNING id_anuncio', [id]); }
  };
  return anuncios;
}
module.exports = crearAnuncioRepository;
