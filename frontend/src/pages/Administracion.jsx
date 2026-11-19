import { useEffect, useState } from 'react';
import { Alert } from '../components/Shared.jsx';
import { api, query } from '../services/api.js';
import { fullName } from '../services/format.js';

const porPagina = 25;

export default function Administracion({ onExpired }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({ busqueda: '', pagina: 0 });
  const [usuarios, setUsuarios] = useState([]);
  const [rut, setRut] = useState('');
  const [configuracion, setConfiguracion] = useState(null);
  const [idRol, setIdRol] = useState('');
  const [idEspecialidad, setIdEspecialidad] = useState('');
  const [idCalendario, setIdCalendario] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let activo = true;
    setCargando(true);
    api(`/usuarios?${query({ busqueda: filtros.busqueda, limite: porPagina + 1,
      desplazamiento: filtros.pagina * porPagina })}`)
      .then(datos => { if (activo) setUsuarios(datos); })
      .catch(err => {
        if (!activo) return;
        setUsuarios([]);
        if (err.status === 401) onExpired();
        else setError(err.message);
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [filtros, onExpired]);

  const rutaUsuario = `/usuarios/${encodeURIComponent(rut)}`;
  useEffect(() => {
    if (!rut) return;
    let activo = true;
    api(`${rutaUsuario}/configuracion`).then(datos => {
      if (!activo) return;
      setConfiguracion(datos);
      setIdCalendario(datos.id_calendario_google);
    }).catch(err => {
      if (!activo) return;
      if (err.status === 401) onExpired();
      else setError(err.message);
    });
    return () => { activo = false; };
  }, [rut, rutaUsuario, onExpired]);

  function seleccionarUsuario(nuevoRut) {
    setRut(nuevoRut);
    setConfiguracion(null);
    setIdRol('');
    setIdEspecialidad('');
    setIdCalendario('');
    setError('');
    setMensaje('');
  }

  function cambiarPagina(pagina, texto = filtros.busqueda) {
    seleccionarUsuario('');
    setFiltros({ busqueda: texto, pagina });
  }

  async function guardar(event, ruta, opciones, aplicar, confirmacion) {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      aplicar(await api(ruta, opciones));
      setMensaje(confirmacion);
    } catch (err) {
      if (err.status === 401) onExpired();
      else setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const especialista = configuracion?.roles.some(rol => rol.nombre.toUpperCase() === 'ESPECIALISTA');
  const rolesDisponibles = configuracion?.roles_disponibles.filter(opcion =>
    !configuracion.roles.some(rol => rol.id_rol === opcion.id_rol));
  const especialidadesDisponibles = configuracion?.especialidades_disponibles.filter(opcion =>
    !configuracion.especialidades.some(especialidad => especialidad.id_especialidad === opcion.id_especialidad));

  return (
    <section className="admin-page">
      <h1>Administración</h1>
      <Alert error>{error}</Alert>
      <Alert>{mensaje}</Alert>
      <section className="panel action-form">
        <h2>Usuarios</h2>
        <form className="toolbar" onSubmit={event => {
          event.preventDefault();
          cambiarPagina(0, busqueda.trim());
        }}>
          <label>Buscar por RUT, nombre o apellido
            <input value={busqueda} maxLength={100} onChange={event => setBusqueda(event.target.value)} />
          </label>
          <button className="secondary" disabled={guardando || cargando}>Buscar</button>
        </form>
        <label>Usuario
          <select value={rut} disabled={guardando || cargando} onChange={event => seleccionarUsuario(event.target.value)}>
            <option value="">Selecciona un usuario</option>
            {usuarios.slice(0, porPagina).map(usuario =>
              <option key={usuario.rut} value={usuario.rut}>{fullName(usuario)} · {usuario.rut}</option>)}
          </select>
        </label>
        {cargando && <p role="status">Buscando usuarios…</p>}
        {!cargando && !usuarios.length && !error && <p>No hay usuarios para esta búsqueda.</p>}
        {(filtros.pagina > 0 || usuarios.length > porPagina) && <div className="toolbar">
          <button className="secondary" disabled={cargando || guardando || filtros.pagina === 0}
            onClick={() => cambiarPagina(filtros.pagina - 1)}>Anterior</button>
          <button className="secondary" disabled={cargando || guardando || usuarios.length <= porPagina}
            onClick={() => cambiarPagina(filtros.pagina + 1)}>Siguiente</button>
        </div>}
      </section>
      {rut && !configuracion && !error && <p role="status">Cargando configuración…</p>}
      {configuracion && <section className="panel action-form">
        <h2>{fullName(configuracion.usuario)}</h2>
        {!configuracion.cuenta_habilitada && <p className="help">Para asignarle roles, primero habilita su cuenta.</p>}
        <h3>Roles</h3>
        <p>{configuracion.roles.map(rol => rol.nombre).join(', ') || 'Sin roles asignados'}</p>
        {configuracion.cuenta_habilitada && rolesDisponibles.length > 0 &&
          <form className="toolbar" onSubmit={event => guardar(event,
            `/roles/usuarios/${encodeURIComponent(rut)}`, { method: 'POST', body: { id_rol: idRol } },
            roles => { setConfiguracion({ ...configuracion, roles }); setIdRol(''); }, 'Rol asignado.')}>
            <label>Nuevo rol
              <select required disabled={guardando} value={idRol} onChange={event => setIdRol(event.target.value)}>
                <option value="">Selecciona un rol</option>
                {rolesDisponibles.map(rol => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>)}
              </select>
            </label>
            <button className="secondary" disabled={guardando || !idRol}>Asignar rol</button>
          </form>}
        {configuracion.cuenta_habilitada && especialista && <>
          <h3>Especialidades</h3>
          <p>{configuracion.especialidades.map(especialidad => especialidad.nombre).join(', ') || 'Sin especialidades asignadas'}</p>
          {especialidadesDisponibles.length > 0 && <form className="toolbar" onSubmit={event => guardar(event,
            `/especialidades/usuarios/${encodeURIComponent(rut)}`, { method: 'POST', body: { id_especialidad: idEspecialidad } },
            especialidades => { setConfiguracion({ ...configuracion, especialidades }); setIdEspecialidad(''); }, 'Especialidad asignada.')}>
            <label>Nueva especialidad
              <select required disabled={guardando} value={idEspecialidad} onChange={event => setIdEspecialidad(event.target.value)}>
                <option value="">Selecciona una especialidad</option>
                {especialidadesDisponibles.map(especialidad =>
                  <option key={especialidad.id_especialidad} value={especialidad.id_especialidad}>{especialidad.nombre}</option>)}
              </select>
            </label>
            <button className="secondary" disabled={guardando || !idEspecialidad}>Asignar especialidad</button>
          </form>}
          <h3>Google Calendar</h3>
          <form className="toolbar" onSubmit={event => guardar(event,
            `${rutaUsuario}/calendario`, { method: 'PUT', body: { id_calendario_google: idCalendario } },
            datos => setIdCalendario(datos.id_calendario_google), 'Calendario guardado. La sincronización de las horas disponibles se inició.')}>
            <label>ID del calendario
              <input required disabled={guardando} value={idCalendario} maxLength={255} autoCapitalize="none" spellCheck={false}
                placeholder="ID de Google Calendar" onChange={event => setIdCalendario(event.target.value)} />
            </label>
            <button className="primary" disabled={guardando || !idCalendario.trim()}>Guardar calendario</button>
          </form>
          <p className="help">Copia el ID del calendario desde Integrar el calendario en Google Calendar.</p>
        </>}
      </section>}
    </section>
  );
}
