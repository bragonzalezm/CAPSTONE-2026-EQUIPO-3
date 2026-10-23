export const $=selector=>document.querySelector(selector);
export function options(select,items,label,placeholder) {
 select.replaceChildren(new Option(placeholder,''));
 for (const item of items) select.add(new Option(label(item),String(item.id)));
 select.disabled=items.length===0;
}
export function mensaje(text,error=false) {
 const node=$('#mensaje');node.textContent=text;node.className=error?'aviso error':'aviso';node.hidden=!text;
}
export function fechaTexto(text) {return text.slice(0,16).replace('T',' ');}
export function diaChile() {
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=t=>p.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
