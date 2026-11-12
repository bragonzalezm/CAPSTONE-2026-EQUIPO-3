'use strict';

function crearCatalogoRepository(dependencias) {
  const { obtenerCatalogo, uno, varios } = dependencias;
  const catalogos = {
    listar(nombreCatalogo) {
      const [tabla, clave] = obtenerCatalogo(nombreCatalogo);
      return varios(`SELECT ${clave}, nombre FROM ${tabla} ORDER BY ${clave}`);
    },
    buscarPorNombre(nombreCatalogo, nombre) {
      const [tabla, clave] = obtenerCatalogo(nombreCatalogo);
      return uno(`SELECT ${clave}, nombre FROM ${tabla} WHERE upper(nombre)=upper($1)`, [nombre]);
    }
  };
  return catalogos;
}
module.exports = crearCatalogoRepository;
