import { useState } from 'react';
import { api } from '../services/api.js';
import { formatRut, validRut } from '../services/format.js';
import { Alert } from '../components/Shared.jsx';
export default function Login({ onLogin, onRegistered, registro = false, rutRegistrado = '' }) {
  const [rut, setRut] = useState(rutRegistrado);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    datos.rut = formatRut(datos.rut);
    if (!validRut(datos.rut)) {
      setError('Revisa el RUT y su dígito verificador.');
      return;
    }
    if (registro && datos.password !== datos.confirmacion_password) {
      setError('Las contraseñas ingresadas deben coincidir.');
      return;
    }
    setBusy(true);
    try {
      const resultado = await api(registro ? '/auth/registro' : '/auth/login', {
        method: 'POST', body: datos
      });
      if (registro) onRegistered(resultado.rut);
      else onLogin(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-page">
      <div className="center-heading">
        <h1>{registro ? 'Crea' : 'Ingresa a'} <em>tu cuenta</em></h1>
      </div>
      <form className="panel login" onSubmit={submit}>
        <Alert error>{error}</Alert>
        <Alert>{rutRegistrado && 'Cuenta creada. Ingresa con tu RUT y contraseña.'}</Alert>
        <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <label>RUT
            <input name="rut" required autoComplete="username" autoCapitalize="characters"
              spellCheck={false} value={rut} onChange={e => setRut(formatRut(e.target.value))}
              placeholder="12345679-3" />
          </label>
          {registro && <>
            <label>Nombres
              <input name="nombres" autoComplete="given-name" required maxLength={100} />
            </label>
            <label>Apellidos
              <input name="apellidos" autoComplete="family-name" required maxLength={100} />
            </label>
            <label>Teléfono
              <input name="telefono" type="tel" autoComplete="tel" required minLength={6} maxLength={25} />
            </label>
            <label>Correo
              <input name="correo" type="email" autoComplete="email" required maxLength={254} />
            </label>
          </>}
          <label>Contraseña
            <input name="password" type="password" required
              autoComplete={registro ? 'new-password' : 'current-password'}
              minLength={registro ? 12 : undefined} maxLength={128}
              aria-describedby={registro ? 'requisito-clave' : undefined} />
          </label>
          {registro && <>
            <p className="help" id="requisito-clave">Usa al menos 12 caracteres.</p>
            <label>Confirma tu contraseña
              <input name="confirmacion_password" type="password" autoComplete="new-password"
                required minLength={12} maxLength={128} />
            </label>
          </>}
        </fieldset>
        <button className="primary full" disabled={busy}>
          {busy ? 'Procesando…' : registro ? 'Registrarse' : 'Ingresar'}
        </button>
      </form>
    </section>
  );
}
