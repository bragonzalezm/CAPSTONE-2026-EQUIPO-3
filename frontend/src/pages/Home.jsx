import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { money } from '../services/format.js';
import { Alert } from '../components/Shared.jsx';
const slides = [
  {photo:'photo-manicura',title:'Belleza a tu ritmo',accent:'y sin barreras.',description:'Un espacio para cuidarte, sentirte bien y dedicarte ese momento que mereces.',caption:'Detalles que enamoran'},
  {photo:'photo-podologia',title:'Bienestar en',accent:'cada paso.',description:'Dale a tus pies la atención que merecen. Encuentra tu próximo momento de cuidado.',caption:'El cuidado empieza contigo'},
  {photo:'photo-salon',title:'Tu belleza,',accent:'en un solo lugar.',description:'Un momento de calma, atención y dedicación. Te esperamos en Nicolett Studio Fantasy.',caption:'Un espacio para ti'}
];
const photos = {podologia:'photo-podologia',peluqueria:'photo-capilar',manicure:'photo-manicura',pedicure:'photo-pedicura',pestanas:'photo-pestanas',depilacion:'photo-depilacion',cejas:'photo-cejas'};
const key = name => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export default function Home({onBook}){
  const [slide,setSlide]=useState(0),[data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [services,setServices]=useState([]),[ads,setAds]=useState([]),[catalogError,setCatalogError]=useState('');
  useEffect(()=>{let active=true; setError('');setData(null);api('/especialidades').then(x=>active&&setData(x)).catch(e=>active&&setError(e.message));return()=>{active=false;};},[retry]);
  useEffect(()=>{let active=true; setCatalogError('');Promise.all([api('/catalogo/servicios'),api('/anuncios')]).then(([s,a])=>{if(active){setServices(s);setAds(a);}}).catch(e=>active&&setCatalogError(e.message));return()=>{active=false;};},[retry]);
  const s=slides[slide];
  return <section className="page">
    <div className="hero" role="region" aria-roledescription="carrusel" aria-label="Nuestro estudio"><div className="hero-inner"><div className="hero-copy"><p className="eyebrow">TU BELLEZA, EN UN SOLO LUGAR</p><h1>{s.title}<br/><em>{s.accent}</em></h1><p className="hero-description">{s.description}</p><a href="#servicios" className="primary inline">Agenda tu hora <span aria-hidden="true">↗</span></a><p className="hero-note"><span className="tiny-star">✧</span> Reserva con un abono de <strong>$5.000</strong></p></div><div className="hero-visual"><div className={`hero-photo ${s.photo}`} role="img" aria-label={s.caption}/><div className="photo-label"><span>EL ARTE DE CUIDARTE</span><strong>{s.caption}</strong></div><span className="hero-star" aria-hidden="true">✧</span></div></div><div className="carousel-controls"><button className="circle" aria-label="Imagen anterior" onClick={()=>setSlide((slide+2)%3)}>←</button><div className="dots">{slides.map((_,i)=><button key={i} className={`dot ${i===slide?'active':''}`} aria-label={`Imagen ${i+1}`} aria-pressed={i===slide} onClick={()=>setSlide(i)}/>)}</div><button className="circle" aria-label="Imagen siguiente" onClick={()=>setSlide((slide+1)%3)}>→</button><span aria-live="polite">0{slide+1} / 03</span></div></div>
    <div className="ribbon"><span>ATENCIÓN PERSONALIZADA</span><i>✧</i><span>BELLEZA INTEGRAL</span><i>✧</i><span>PODOLOGÍA CLÍNICA</span></div>
    <section id="servicios" className="services-section"><div className="section-heading"><div><p className="eyebrow">ENCUENTRA TU MOMENTO</p><h2>¿Qué deseas <em>agendar?</em></h2></div><p>Elige el cuidado que necesitas.<br/>Nosotras ponemos la dedicación.</p></div>
    {error?<><Alert error>{error}</Alert><button className="secondary" onClick={()=>setRetry(retry+1)}>Reintentar</button></>:data===null?<p className="empty" role="status">Cargando especialidades…</p>:data.length===0?<p className="empty">Aún no hay especialidades disponibles.</p>:<div className="service-grid">{data.map(e=><button className="service-card featured" key={e.id_especialidad} onClick={()=>onBook(e)}><div className={`service-photo ${photos[key(e.nombre)]||'photo-salon'}`} role="img" aria-label={e.nombre}/><div className="service-info"><span className="tag">CONSULTA DISPONIBILIDAD</span><h3>{e.nombre}</h3><p>Encuentra tu próxima hora</p><span className="service-arrow" aria-hidden="true">↗</span></div></button>)}</div>}
    </section>
    {ads.length>0&&<section className="services-section notices" aria-label="Avisos del estudio">{ads.map(a=><article className="panel" key={a.id_anuncio}><p className="eyebrow">NOVEDADES</p><h2>{a.titulo}</h2><p className="preserve-lines">{a.contenido}</p></article>)}</section>}
    {catalogError&&<div className="services-section"><Alert error>{catalogError}</Alert><button className="secondary" onClick={()=>setRetry(retry+1)}>Reintentar catálogo y avisos</button></div>}
    {services.length>0&&<section className="services-section" id="catalogo"><p className="eyebrow">NUESTROS SERVICIOS</p><h2>Cuidados para <em>cada momento</em></h2><div className="catalog-grid">{services.map(s=><article className="panel catalog-item" key={s.id_servicio}><h3>{s.nombre}</h3><p>{s.descripcion}</p><strong>{String(s.tipo_precio).toUpperCase()==='DESDE'?'Desde ':''}{money(s.precio_oferta??s.precio)}</strong>{s.precio_oferta!=null&&<del>{money(s.precio)}</del>}</article>)}</div></section>}
  </section>;
}
