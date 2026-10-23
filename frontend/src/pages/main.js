import {api} from '../services/api.js';
import {$,mensaje,diaChile} from '../components/ui.js';
import './admin.js';
const state={service:null,professionals:[],selected:null,data:null,week:diaChile(),day:diaChile(),request:0,operation:null,busy:false,payload:null,loading:false};
const pages=['inicio-page','booking-page','success-page','admin-page'];
function page(id){for(const p of pages) $('#'+p).hidden=p!==id;mensaje('');window.scrollTo({top:0,behavior:'instant'});}
function step(n){page('booking-page');for(const [i,id] of ['schedule-step','data-step','review-step'].entries())$('#'+id).hidden=i+1!==n;for(const li of document.querySelectorAll('.steps li')){const num=Number(li.dataset.step);li.classList.toggle('active',num===n);li.classList.toggle('done',num<n);if(num===n)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}}
function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const maxDate=addDays(diaChile(),90);
function dateLabel(date,options={weekday:'long',day:'numeric',month:'long'}){return new Intl.DateTimeFormat('es-CL',{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
function fullName(p){return [p.nombres,p.ap_paterno,p.ap_materno].filter(Boolean).join(' ');}
function homeHash(){if(location.hash==='#servicios'){page('inicio-page');$('#servicios').scrollIntoView({behavior:'smooth'});}else if(location.hash==='#inicio'){page('inicio-page');}}
window.addEventListener('hashchange',homeHash);
for(const a of document.querySelectorAll('a[href="#inicio"],a[href="#servicios"]'))a.addEventListener('click',()=>{if(location.hash===a.hash)homeHash();});
$('#nav-admin').onclick=()=>page('admin-page');
$('#back-services').onclick=()=>{page('inicio-page');$('#servicios').scrollIntoView({behavior:'smooth'});};
const slides=[{photo:'photo-manicura',title:'Belleza a tu ritmo<br><em>y sin barreras.</em>',description:'Un espacio para cuidarte, sentirte bien y dedicarte ese momento que mereces.',caption:'Detalles que enamoran',alt:'Manicura en tonos suaves'}, {photo:'photo-podologia',title:'Bienestar en<br><em>cada paso.</em>',description:'Dale a tus pies la atención que merecen. Agenda tu sesión de podología clínica.',caption:'El cuidado empieza contigo',alt:'Atención de podología'}, {photo:'photo-salon',title:'Tu belleza,<br><em>en un solo lugar.</em>',description:'Un momento de calma, atención y dedicación. Te esperamos en Nicolett Studio Fantasy.',caption:'Un espacio para ti',alt:'Ambiente del estudio, imagen de referencia'}];
let slide=0;
function showSlide(n){slide=(n+slides.length)%slides.length;const s=slides[slide];$('#hero-title').innerHTML=s.title;$('#hero-description').textContent=s.description;$('#hero-caption').textContent=s.caption;$('#hero-image').className='hero-photo '+s.photo;$('#hero-image').setAttribute('aria-label',s.alt);$('#slide-count').textContent=`0${slide+1} / 03`;for(const [i,d] of [...$('#slide-dots').children].entries()){d.classList.toggle('active',i===slide);d.setAttribute('aria-pressed',String(i===slide));}}
slides.forEach((s,i)=>{const b=document.createElement('button');b.className='dot';b.setAttribute('aria-label',`Imagen ${i+1}`);b.onclick=()=>showSlide(i);$('#slide-dots').append(b);});
$('#slide-prev').onclick=()=>showSlide(slide-1);$('#slide-next').onclick=()=>showSlide(slide+1);showSlide(0);
$('#fecha').min=diaChile();$('#fecha').max=maxDate;$('#fecha').value=state.day;
function renderDays(){
 $('#days').replaceChildren();$('#month-label').textContent=dateLabel(state.week,{month:'long',year:'numeric'});$('#selected-date').textContent=dateLabel(state.day);
 for(let i=0;i<6;i++){const d=addDays(state.week,i);if(d>maxDate)break;const b=document.createElement('button');b.className='day'+(d===state.day?' selected':'');b.setAttribute('aria-pressed',String(d===state.day));b.setAttribute('aria-label',dateLabel(d));const dow=document.createElement('span'),num=document.createElement('strong'),month=document.createElement('small');dow.textContent=dateLabel(d,{weekday:'short'}).replace('.','');num.textContent=String(Number(d.slice(8)));month.textContent=dateLabel(d,{month:'short'}).replace('.','');b.append(dow,num,month);b.onclick=()=>{state.day=d;$('#fecha').value=d;renderDays();loadHours();};$('#days').append(b);}
 $('#week-prev').disabled=state.week<=diaChile();$('#week-next').disabled=addDays(state.week,6)>maxDate;
}
function placeholder(){const el=document.createElement('div');el.className='portrait';el.innerHTML='<span class="silhouette" aria-hidden="true"></span><small>Fotografía sin especificar</small>';return el;}
async function loadHours(){
 if(state.loading)return;
 const token=++state.request;$('#professionals').innerHTML='<p class="empty">Buscando horas disponibles…</p>';mensaje('');
 try{const results=await Promise.all(state.professionals.map(async p=>({p,hours:await api(`/especialistas/${p.id}/horarios?fecha=${state.day}`)})));if(token!==state.request)return;
 $('#professionals').replaceChildren();if(!results.length){$('#professionals').innerHTML='<p class="empty">Aún no hay especialistas asociados a podología clínica.</p>';return;}
 for(const {p,hours} of results){const card=document.createElement('article');card.className='professional-card';const main=document.createElement('div');main.className='professional-main';const info=document.createElement('div');info.className='professional-info';info.append(placeholder());const name=document.createElement('h3');name.textContent=fullName(p);const desc=document.createElement('p');desc.textContent='Podología clínica · Atención particular';info.append(name,desc);const list=document.createElement('div');list.className='hours';const buttons=[];
 if(!hours.length){const text=document.createElement('p');text.className='hours-empty';text.textContent='Sin horas disponibles. Prueba otro día.';list.append(text);}
 hours.forEach((h,i)=>{const b=document.createElement('button');b.className='hour';b.textContent=h.fecha_inicio.slice(11,16);b.setAttribute('aria-label',`Reservar con ${fullName(p)} a las ${b.textContent}`);b.hidden=i>=5;b.onclick=()=>{state.selected={professional:p,...h};state.operation=null;$('#appointment-mini').textContent=`Podología clínica · ${fullName(p)} · ${dateLabel(h.fecha_inicio.slice(0,10))} · ${h.fecha_inicio.slice(11,16)}`;step(2);};list.append(b);buttons.push(b);});main.append(info,list);card.append(main);
 if(hours.length>5){const more=document.createElement('button');more.className='professional-footer more-hours';more.textContent='Ver más horas disponibles ↓';more.onclick=()=>{buttons.forEach(b=>b.hidden=false);more.hidden=true;};card.append(more);}else{const foot=document.createElement('div');foot.className='professional-footer';foot.textContent=hours.length?`${hours.length} horas disponibles · selecciona una hora`:'Selecciona otro día en el calendario';card.append(foot);}$('#professionals').append(card);}
 }catch(e){if(token!==state.request)return;$('#professionals').innerHTML='<p class="empty">No fue posible cargar las horas. Cambia de día para reintentar.</p>';mensaje(e.message,true);}
}
$('#podologia-button').onclick=async()=>{
 state.loading=true;step(1);renderDays();$('#professionals').innerHTML='<p class="empty">Cargando especialistas…</p>';const token=++state.request;
 try{const catalog=await api('/especialidades');const service=catalog.find(s=>s.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('podolog'));
 if(token!==state.request)return;if(!service){state.loading=false;$('#professionals').innerHTML='<p class="empty">Podología clínica todavía no está registrada en el catálogo.</p>';return;}state.service=service;const professionals=await api(`/especialistas?especialidad=${service.id}`);if(token!==state.request)return;state.professionals=professionals;state.loading=false;await loadHours();}catch(e){state.loading=false;if(token===state.request){$('#professionals').innerHTML='<p class="empty">No fue posible cargar la agenda.</p>';mensaje(e.message,true);}}
};
$('#week-next').onclick=()=>{state.week=addDays(state.week,6);state.day=state.week;$('#fecha').value=state.day;renderDays();loadHours();};
$('#week-prev').onclick=()=>{state.week=[addDays(state.week,-6),diaChile()].sort().at(-1);state.day=state.week;$('#fecha').value=state.day;renderDays();loadHours();};
$('#fecha').onchange=()=>{const d=$('#fecha').value;if(!d||d<diaChile()||d>maxDate){mensaje('Selecciona una fecha dentro de los próximos 90 días.',true);return;}state.day=d;state.week=d;renderDays();loadHours();};
$('#back-schedule').onclick=()=>{step(1);renderDays();loadHours();};$('#back-data').onclick=()=>step(2);
function validRun(value){const v=value.replace(/\./g,'').toUpperCase();if(!/^\d{7,8}-[0-9K]$/.test(v))return false;let sum=0,m=2;for(const n of [...v.split('-')[0]].reverse()){sum+=Number(n)*m;m=m===7?2:m+1;}const r=11-sum%11;return v.split('-')[1]===(r===11?'0':r===10?'K':String(r));}
$('#datos-form').onsubmit=e=>{e.preventDefault();if(!state.selected)return;const data=Object.fromEntries(new FormData(e.currentTarget));for(const key of Object.keys(data))data[key]=data[key].trim();if(!validRun(data.run)){mensaje('Revisa el RUT y su dígito verificador. Ejemplo: 12.345.678-5.',true);return;}if(!data.nombre||!data.apellido||!/^9\d{8}$/.test(data.num_cel)){mensaje('Completa tu nombre, apellidos y un celular de 9 dígitos.',true);return;}state.data=data;state.operation=null;$('#review-professional').textContent=fullName(state.selected.professional);$('#review-date').textContent=dateLabel(state.day);$('#review-hour').textContent=state.selected.fecha_inicio.slice(11,16)+' hrs';$('#review-name').textContent=data.nombre+' '+data.apellido;$('#review-email').textContent=data.correo_electronico;step(3);};
const dialog=$('#payment-dialog');
function closePayment(){if(state.busy)return;dialog.close();$('#payment-error').hidden=true;for(const li of document.querySelectorAll('.steps li')){li.classList.toggle('active',li.dataset.step==='3');if(li.dataset.step==='3')li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}}
$('#open-payment').onclick=()=>{if(!state.data||!state.selected)return;const next={...state.data,id_especialista:state.selected.professional.id,id_especialidad:state.service.id,fecha_inicio:state.selected.fecha_inicio,indicaciones_especiales:$('#indicaciones').value};if(!state.operation||JSON.stringify(next)!==JSON.stringify(state.payload)){state.payload=next;state.operation=crypto.randomUUID();}$('#payment-error').hidden=true;$('#payment-status').textContent='';dialog.showModal();for(const li of document.querySelectorAll('.steps li')){li.classList.toggle('active',li.dataset.step==='4');if(li.dataset.step==='4')li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}};
$('#close-payment').onclick=closePayment;$('#cancel-payment').onclick=closePayment;dialog.addEventListener('cancel',e=>{e.preventDefault();closePayment();});
$('#confirm-payment').onclick=async()=>{
 if(state.busy)return;state.busy=true;dialog.classList.add('busy');for(const id of ['confirm-payment','close-payment','cancel-payment'])$('#'+id).disabled=true;$('#payment-error').hidden=true;$('#payment-status').textContent='Procesando tu abono simulado y confirmando la hora…';
 try{const result=await api('/reservas/pago-simulado',{method:'POST',body:JSON.stringify({...state.payload,operacion:state.operation})});$('#success-id').textContent='#'+result.id;$('#success-professional').textContent=fullName(state.selected.professional);$('#success-date').textContent=dateLabel(result.fecha_inicio.slice(0,10))+' · '+result.fecha_inicio.slice(11,16);dialog.close();page('success-page');}
 catch(e){$('#payment-status').textContent='';if(e.status===409){dialog.close();step(1);await loadHours();mensaje(e.message,true);state.operation=null;}else{$('#payment-error').textContent=e.message;$('#payment-error').hidden=false;}}
 finally{state.busy=false;dialog.classList.remove('busy');for(const id of ['confirm-payment','close-payment','cancel-payment'])$('#'+id).disabled=false;}
};
$('#new-booking').onclick=()=>{$('#datos-form').reset();$('#indicaciones').value='';state.selected=null;state.data=null;state.operation=null;state.payload=null;page('inicio-page');location.hash='inicio';};
homeHash();
