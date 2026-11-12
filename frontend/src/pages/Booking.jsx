import { useEffect, useState } from 'react';
import { api, query } from '../services/api.js';
import { chileDate, addDays, dayLabel, fullName, hour, normalizeRut, validRut } from '../services/format.js';
import { Alert, Portrait } from '../components/Shared.jsx';
const emptyCustomer={rut:'',nombres:'',apellidos:'',telefono:'',correo:''};
export default function Booking({specialty,session,manual=false,onExit,onSaved}){
  const [day,setDay]=useState(chileDate()),[week,setWeek]=useState(chileDate()),[people,setPeople]=useState([]),[slots,setSlots]=useState([]);
  const [step,setStep]=useState(1),[selected,setSelected]=useState(null),[customer,setCustomer]=useState(emptyCustomer),[notes,setNotes]=useState(''),[reason,setReason]=useState('');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[receipt,setReceipt]=useState(null);
  const isAdmin=session?.roles?.some(r=>r.nombre.toUpperCase()==='ADMINISTRADOR');
  const personalData=!manual&&session?.usuario;
  useEffect(()=>{let alive=true;setLoading(true);setError('');setSlots([]);
    api(`/especialidades/${specialty.id_especialidad}/especialistas`).then(async list=>{
      const filtered=manual&&!isAdmin?list.filter(p=>p.rut===session?.usuario.rut):list;
      const result=await Promise.all(filtered.map(async p=>({p,hours:await api(`/horarios/disponibilidad?${query({rut_especialista:p.rut,id_especialidad:specialty.id_especialidad,desde:day,hasta:day})}`)})));
      if(alive){setPeople(filtered);setSlots(result);}
    }).catch(e=>alive&&setError(e.message)).finally(()=>alive&&setLoading(false));return()=>{alive=false;};
  },[specialty.id_especialidad,day,refresh,manual,isAdmin,session?.usuario.rut]);
  const changeDay=d=>{if(!d)return;setDay(d);setWeek(d);setSelected(null);};
  const next=(n)=>{setError('');setStep(n);window.scrollTo({top:0,behavior:'instant'});};
  function select(p,h){setSelected({p,...h});next(personalData?3:2);}
  function submitData(e){e.preventDefault();if(!validRut(customer.rut)){setError('Revisa el RUT y su dígito verificador. Usa el formato 12345678-5.');return;}setCustomer({...customer,rut:normalizeRut(customer.rut)});next(3);}
  async function saveManual(){
    if(busy)return;setBusy(true);setError('');
    try{
      const r=await api('/reservas/manual',{method:'POST',body:{rut_especialista:selected.p.rut,id_especialidad:specialty.id_especialidad,fecha_hora_inicio:selected.inicio,fecha_hora_fin:selected.fin,motivo:reason,indicaciones:notes,cliente:customer}});
      setReceipt(r);next(4);
    }catch(e){setError(e.message);if(e.code==='HORARIO_OCUPADO'){setSelected(null);setStep(1);setRefresh(x=>x+1);}}
    finally{setBusy(false);}
  }
  const summary=selected&&`${specialty.nombre} · ${fullName(selected.p)} · ${dayLabel(chileDate(selected.inicio))} · ${hour(selected.inicio)}–${hour(selected.fin)}`;
  if(receipt)return <section className="success-page"><div className="receipt"><div className="success-seal">✓</div><p className="eyebrow">RESERVA MANUAL CONFIRMADA</p><h1>La hora quedó <em>agendada.</em></h1><p>Reserva #{receipt.id_reserva}</p><p>{summary}</p><p>{fullName(customer)}</p><p className="help">No se registró un abono. No se enviaron mensajes automáticos.</p><button className="primary" onClick={onSaved}>Volver a la agenda</button></div></section>;
  return <section className="booking-shell"><div className="booking-top"><button className="text-button" disabled={busy} onClick={onExit}>← {manual?'Agenda':'Especialidades'}</button><span>{manual?'RESERVA MANUAL':'RESERVA EN LÍNEA'}</span></div>
  <ol className="steps" aria-label="Pasos de la reserva">{['Elige tu hora','Tus datos','Confirma'].map((label,i)=><li key={label} className={step===i+1?'active':step>i+1?'done':''} aria-current={step===i+1?'step':undefined}><span>{i+1}</span>{manual&&i===1?'Datos de la clienta':label}</li>)}</ol>
  <Alert error>{error}</Alert>
  {step===1&&<><div className="center-heading"><p className="eyebrow">CUIDADO QUE SE SIENTE</p><h1>{specialty.nombre}</h1><p>Elige el día, tu especialista y el horario completo de tu atención.</p></div>
  <div className="calendar-heading"><div><span className="eyebrow">HORAS DISPONIBLES</span><h2>{dayLabel(day)}</h2></div><label className="date-picker">Ir a una fecha<input type="date" value={day} min={chileDate()} max={addDays(chileDate(),90)} onChange={e=>changeDay(e.target.value)}/></label></div>
  <div className="week-selector"><button className="circle" aria-label="Semana anterior" disabled={week<=chileDate()} onClick={()=>changeDay(addDays(week,-7)<chileDate()?chileDate():addDays(week,-7))}>←</button><div className="days">{Array.from({length:7},(_,i)=>addDays(week,i)).map(d=><button key={d} className={`day ${d===day?'selected':''}`} disabled={d>addDays(chileDate(),90)} aria-pressed={d===day} onClick={()=>{setDay(d);setSelected(null);}}><span>{new Intl.DateTimeFormat('es-CL',{weekday:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'))}</span><strong>{Number(d.slice(8))}</strong><small>{d.slice(5,7)}</small></button>)}</div><button className="circle" aria-label="Semana siguiente" disabled={addDays(week,7)>addDays(chileDate(),90)} onClick={()=>changeDay(addDays(week,7))}>→</button></div>
  <div className="schedule-meta"><span>{dayLabel(day)}</span><span>Hora de Chile · duración según el bloque</span></div>
  {loading?<p className="empty" role="status">Buscando horarios…</p>:error?<button className="secondary" onClick={()=>setRefresh(x=>x+1)}>Reintentar</button>:!people.length?<p className="empty">Todavía no hay especialistas habilitadas para esta especialidad{manual?' en tu agenda':''}.</p>:<div className="professionals">{slots.map(({p,hours})=><article className="professional-card" key={p.rut}><div className="professional-main"><div className="professional-info"><Portrait/><h3>{fullName(p)}</h3><p>{specialty.nombre}</p></div><div className="hours">{hours.filter(h=>h.disponible&&new Date(h.inicio)>new Date()).length===0?<p className="hours-empty">Sin horas disponibles. Prueba otro día.</p>:hours.filter(h=>h.disponible&&new Date(h.inicio)>new Date()).map(h=><button key={`${h.id_horario}-${h.inicio}`} className="hour" onClick={()=>select(p,h)}>{hour(h.inicio)}–{hour(h.fin)}</button>)}</div></div></article>)}</div>}
  <p className="booking-footnote">Seleccionar una hora todavía no la reserva.</p></>}
  {step===2&&<><div className="center-heading"><p className="eyebrow">YA ESTÁS UN PASO MÁS CERCA</p><h1>{manual?'Datos de la clienta':'Ingresa tus datos'}</h1></div><p className="appointment-mini">{summary}</p><form className="data-form panel" onSubmit={submitData}>{[['rut','RUT','text',10],['nombres','Nombres','text',100],['apellidos','Apellidos','text',100],['telefono','Teléfono','tel',25],['correo','Correo (opcional)','email',254]].map(([name,label,type,maxLength])=><label key={name}>{label}<input name={name} type={type} maxLength={maxLength} required={name!=='correo'} value={customer[name]} onChange={e=>setCustomer({...customer,[name]:e.target.value})} placeholder={name==='rut'?'12345678-5':name==='telefono'?'+56912345678':''}/></label>)}<button className="primary">Siguiente →</button><button type="button" className="text-button full" onClick={()=>next(1)}>← Elegir otra hora</button></form></>}
  {step===3&&<><div className="center-heading"><p className="eyebrow">REVISA LOS DETALLES</p><h1>Tu momento <em>está cerca</em></h1></div><div className="review-card panel"><p className="appointment-mini">{summary}</p><div className="review-customer"><span>RESERVA A NOMBRE DE</span><strong>{fullName(personalData||customer)}</strong><span>{(personalData||customer).correo}</span>{personalData&&<p>Usamos los datos de tu cuenta.</p>}</div><label>Motivo (opcional)<input maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><label>Indicaciones especiales (opcional)<textarea rows={4} maxLength={1000} placeholder="Alergias, acompañantes u otra consideración." value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  {manual?<><p className="help">Se confirmará como reserva manual sin abono.</p><button className="primary full" disabled={busy} onClick={saveManual}>{busy?'Guardando…':'Confirmar reserva manual'}</button></>:<><div className="deposit-summary"><div><strong>Abono de reserva</strong><span>Se requiere pago para confirmar la hora en línea.</span></div><strong>$5.000 <small>CLP</small></strong></div><div className="payment-demo" role="status">El pago en línea todavía no está habilitado. Esta selección no ha creado una reserva ni realizado un cobro.</div><a className="primary full" href="https://wa.me/56940322551" target="_blank" rel="noopener noreferrer">Consultar con Nicolett ↗</a><p className="help">Nicolett puede coordinar y agendar tu hora manualmente.</p></>}
  <button className="text-button full" disabled={busy} onClick={()=>next(personalData?1:2)}>← Volver</button></div></>}
  </section>;
}
