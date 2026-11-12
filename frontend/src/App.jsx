import { useCallback, useEffect, useState } from 'react';
import { api } from './services/api.js';
import { Brand, Footer, Alert } from './components/Shared.jsx';
import Home from './pages/Home.jsx';
import Booking from './pages/Booking.jsx';
import Login from './pages/Login.jsx';
import Agenda from './pages/Agenda.jsx';
import Horarios from './pages/Horarios.jsx';
export default function App(){
  const [page,setPage]=useState('inicio'),[selection,setSelection]=useState(null),[manual,setManual]=useState(false);
  const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[error,setError]=useState(''),[leaving,setLeaving]=useState(false);
  useEffect(()=>{let active=true;api('/usuarios/mi-perfil').then(usuario=>active&&setSession({usuario,roles:null})).catch(e=>{if(active&&e.status!==401)setError(e.message);}).finally(()=>active&&setChecking(false));return()=>{active=false;};},[]);
  const expired=useCallback(()=>{setSession(null);setPage('login');setError('Tu sesión terminó. Vuelve a ingresar.');},[]);
  useEffect(()=>{
    function navigate(){const hash=location.hash;if(['#inicio','#servicios','#contacto'].includes(hash)){setPage('inicio');setSelection(null);requestAnimationFrame(()=>requestAnimationFrame(()=>{if(hash==='#inicio')window.scrollTo({top:0});else document.getElementById(hash.slice(1))?.scrollIntoView({behavior:'smooth'});}));}}
    window.addEventListener('hashchange',navigate);navigate();return()=>window.removeEventListener('hashchange',navigate);
  },[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[page]);
  function book(s,isManual=false){setError('');setSelection(s);setManual(isManual);setPage('reserva');}
  function homeClick(event){const hash=event.currentTarget.hash;if(hash===location.hash){setPage('inicio');setSelection(null);setTimeout(()=>{if(hash==='#inicio')window.scrollTo({top:0});else document.getElementById(hash.slice(1))?.scrollIntoView();},0);}}
  function loginDone(s){setSession(s);setError('');const staff=s.roles.some(r=>['ADMINISTRADOR','ESPECIALISTA'].includes(r.nombre.toUpperCase()));setPage(staff?'agenda':'inicio');}
  function openAccount(){setError('');if(session?.roles?.some(r=>['ADMINISTRADOR','ESPECIALISTA'].includes(r.nombre.toUpperCase())))setPage('agenda');else setPage('login');}
  async function logout(){setLeaving(true);try{await api('/auth/logout',{method:'POST'});setSession(null);setPage('inicio');setSelection(null);setError('');}catch(e){setError(e.message);}finally{setLeaving(false);}}
  return <><header className="site-header"><div onClick={e=>{if(e.target.closest('a')){setPage('inicio');setSelection(null);}}}><Brand/></div><nav aria-label="Navegación principal"><a href="#inicio" onClick={homeClick}>Inicio</a><a href="#servicios" onClick={homeClick}>Agenda tu hora</a><a href="#contacto" onClick={homeClick}>Contacto</a><button className="nav-link" disabled={checking} onClick={openAccount}>{session?.roles?.some(r=>['ADMINISTRADOR','ESPECIALISTA'].includes(r.nombre.toUpperCase()))?'Mi agenda':'Ingresar al panel'}</button>{session&&<button className="nav-link" disabled={leaving} onClick={logout}>{leaving?'Saliendo…':'Salir'}</button>}</nav><span className="header-detail">BELLEZA & BIENESTAR</span></header><main><Alert error>{error}</Alert>{checking?<p className="empty" role="status">Preparando tu visita…</p>:page==='inicio'?<Home onBook={book}/>:page==='reserva'&&selection?<Booking key={`${selection.id_especialidad}-${manual}`} specialty={selection} session={session} manual={manual} onExit={()=>setPage(manual?'agenda':'inicio')} onSaved={()=>setPage('agenda')}/>:page==='horarios'&&session?<Horarios session={session} onBack={()=>setPage('agenda')} onExpired={expired}/>:page==='agenda'&&session?<Agenda onHorarios={()=>setPage('horarios')} session={session} onManual={s=>book(s,true)} onExpired={expired}/>:<Login onLogin={loginDone}/>}</main><Footer onHome={()=>{setPage('inicio');setSelection(null);window.scrollTo({top:0});}}/></>;
}
