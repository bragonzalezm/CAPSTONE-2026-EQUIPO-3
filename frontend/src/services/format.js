export const ZONE = 'America/Santiago';
export const fullName = p => [p.nombres, p.apellidos].filter(Boolean).join(' ');
export function chileDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(value));
  const get = name => parts.find(p => p.type === name).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10);
}
export const dayLabel = day => new Intl.DateTimeFormat('es-CL', { timeZone:'UTC', weekday:'long',day:'numeric',month:'long' }).format(new Date(`${day}T12:00:00Z`));
export const hour = iso => new Intl.DateTimeFormat('es-CL', { timeZone:ZONE, hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date(iso));
export const dateTime = iso => new Intl.DateTimeFormat('es-CL', { timeZone:ZONE, day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date(iso));
export const money = value => new Intl.NumberFormat('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
export function normalizeRut(value) { return value.replace(/\./g,'').replace(/\s/g,'').toUpperCase(); }
export function validRut(value) {
  const v=normalizeRut(value); if(!/^\d{7,8}-[\dK]$/.test(v)) return false;
  const [num,dv]=v.split('-'); let sum=0,factor=2;
  for(const char of [...num].reverse()){sum+=Number(char)*factor;factor=factor===7?2:factor+1;}
  const r=11-sum%11; return dv===(r===11?'0':r===10?'K':String(r));
}
