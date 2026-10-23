const BASE=location.port==='5500'?'http://localhost:3000/api':'/api';
let adminKey='';
export function setAdminKey(key) {adminKey=key;}
export async function api(path,options={}) {
 const {admin=false,...request}=options;
 let response;
 try {response=await fetch(BASE+path,{...request,headers:{'Content-Type':'application/json',...(admin?{Authorization:`Bearer ${adminKey}`}:{})}});}
 catch {throw new Error('No se pudo conectar al servidor.');}
 const data=await response.json();
 if (!response.ok) {const error=new Error(data.mensaje ?? 'No se pudo completar la operación.');error.status=response.status;throw error;}
 return data;
}
