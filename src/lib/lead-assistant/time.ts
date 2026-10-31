import {lisbonDate} from './policy';
export function lisbonDayBounds(date:string) {
 const target=new Date(`${date}T00:00:00Z`); if(Number.isNaN(target.getTime()))throw new Error('Invalid report date');
 function midnight(day:string) {let x=new Date(`${day}T00:00:00Z`).getTime();for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(x));const p=Object.fromEntries(parts.map(a=>[a.type,a.value]));const asUTC=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);x+=Date.parse(`${day}T00:00:00Z`)-asUTC;}return new Date(x).toISOString();}
 target.setUTCDate(target.getUTCDate()+1);return {start:midnight(date),end:midnight(target.toISOString().slice(0,10))};
}
