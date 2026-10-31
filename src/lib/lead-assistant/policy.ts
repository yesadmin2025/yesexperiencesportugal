export const OWNER_REPORT_EMAIL = 'Yesexperiences@gmail.com';
export const REPORT_HOUR = 9;
export function lisbonDate(now = new Date()): string {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function previousLisbonDay(now = new Date()): string {
 const d = new Date(`${lisbonDate(now)}T12:00:00Z`); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10);
}
export function isReportHour(now = new Date()): boolean {
 return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',hour:'numeric',hourCycle:'h23'}).format(now))===REPORT_HOUR;
}
export function withinReplyWindow(lastInbound: string | null, now = new Date()): boolean {
 if (!lastInbound) return false;
 const age=now.getTime()-new Date(lastInbound).getTime(); return age>=0 && age<24*3600000;
}
export function dailyMoney(rows: Array<{id:string;kind:string;environment:string;amount:number|null;currency:string|null}>) {
 const seen=new Set<string>(); const totals:Record<string,number>={}; let sales=0;
 for (const r of rows) { if(r.environment!=='live'||seen.has(r.id)||!['payment','refund'].includes(r.kind))continue; if(!r.currency)throw new Error('Payment currency missing'); seen.add(r.id); const c=r.currency.toUpperCase(); totals[c]=(totals[c]??0)+(r.kind==='refund'?-1:1)*Math.abs(r.amount??0); if(r.kind==='payment')sales++; }
 return {sales,netMinorUnits:totals};
}
