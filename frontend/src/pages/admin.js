import {api,setAdminKey} from '../services/api.js';
import {$,mensaje,fechaTexto} from '../components/ui.js';
async function cargarAgenda() {
 const fecha=$('#filtro-fecha').value;
 const filas=await api('/reservas'+(fecha?`?fecha=${fecha}`:''),{admin:true});
 $('#reservas').replaceChildren();
 if(!filas.length){const row=$('#reservas').insertRow();const cell=row.insertCell();cell.colSpan=6;cell.textContent='No hay reservas para mostrar.';}
 for(const r of filas){const row=$('#reservas').insertRow();
 for(const text of [`#${r.id}`,`${r.nombre} ${r.apellido} — ${r.num_cel}`,`${r.especialidad} · ${r.especialista}`,fechaTexto(r.fecha_inicio),`${r.estado}${r.pagada?' · pagada':r.pago_simulado?' · abono simulado':''}`]) row.insertCell().textContent=text;
 const actions=row.insertCell();
 if(r.estado!=='cancelada' && !r.pagada){
  const cancelar=document.createElement('button');cancelar.textContent='Cancelar';cancelar.onclick=async()=>{
   if(!confirm(`¿Cancelar la reserva #${r.id}?`))return;cancelar.disabled=true;
   try{await api(`/reservas/${r.id}/cancelar`,{method:'PATCH',admin:true});await cargarAgenda();mensaje('Reserva cancelada.');}catch(e){mensaje(e.message,true);cancelar.disabled=false;}
  };actions.append(cancelar);
  const pagar=document.createElement('button');pagar.textContent='Registrar pago';pagar.onclick=async()=>{
   const value=prompt('Monto recibido en pesos chilenos (registro manual; no realiza un cobro):');if(value===null)return;
   const monto=Number(value);if(!Number.isSafeInteger(monto)||monto<=0){mensaje('Ingresa un monto entero positivo.',true);return;}
   pagar.disabled=true;try{await api(`/reservas/${r.id}/pago-manual`,{method:'POST',admin:true,body:JSON.stringify({monto})});await cargarAgenda();mensaje('Pago manual registrado.');}catch(e){mensaje(e.message,true);pagar.disabled=false;}
  };actions.append(pagar);
 }
 }
}
$('#login-form').onsubmit=async e=>{e.preventDefault();setAdminKey($('#admin-key').value);try{await cargarAgenda();$('#admin-key').value='';$('#login-form').hidden=true;$('#agenda').hidden=false;mensaje('');}catch(err){setAdminKey('');mensaje(err.message,true);}};
$('#actualizar').onclick=()=>cargarAgenda().catch(e=>mensaje(e.message,true));
$('#filtro-fecha').onchange=$('#actualizar').onclick;
$('#salir').onclick=()=>{setAdminKey('');$('#reservas').replaceChildren();$('#agenda').hidden=true;$('#login-form').hidden=false;mensaje('');};
