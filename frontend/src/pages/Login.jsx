import { useState } from 'react';
import { api } from '../services/api.js';
import { normalizeRut } from '../services/format.js';
import { Alert } from '../components/Shared.jsx';
export default function Login({onLogin}){
  const [rut,setRut]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{const s=await api('/auth/login',{method:'POST',body:{rut:normalizeRut(rut),password}});setPassword('');onLogin(s);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="admin-page"><div className="center-heading"><p className="eyebrow">BIENVENIDA A NICOLETT</p><h1>Ingresa a <em>tu cuenta</em></h1><p>Gestiona tu agenda con tu RUT y contraseña.</p></div><form className="panel login" onSubmit={submit}><Alert error>{error}</Alert><label>RUT<input required autoComplete="username" value={rut} onChange={e=>setRut(e.target.value)} placeholder="12345678-5"/></label><label>Contraseña<input required autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary full" disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button></form></section>;
}
