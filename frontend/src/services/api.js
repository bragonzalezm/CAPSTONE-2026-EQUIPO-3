// Siempre rutas relativas: Vite las reenvía al backend en desarrollo.
// La sesión vive en una cookie HttpOnly, nunca en localStorage.
export async function api(path, { body, ...options } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include', ...options,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    throw new Error('No pudimos conectar. Comprueba que el backend esté encendido y vuelve a intentar.');
  }
  if (response.status === 204) return null;
  let payload;
  try { payload = await response.json(); } catch { throw new Error('El servidor no devolvió una respuesta válida. Revisa la conexión del backend.'); }
  if (!response.ok || payload.ok !== true) {
    const error = new Error(payload.error?.mensaje || 'No fue posible completar la solicitud.');
    error.status = response.status;
    error.code = payload.error?.codigo;
    throw error;
  }
  return payload.datos;
}
export const query = (data) => new URLSearchParams(Object.entries(data).filter(([, v]) => v !== '' && v != null)).toString();
