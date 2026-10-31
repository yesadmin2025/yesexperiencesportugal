import {it,expect} from 'vitest';
import {signatureQuote} from '@/lib/lead-assistant/quotes.server';
function admin(tiers:unknown){return {from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{tiers,updated_at:'2026-10-31'},error:null})})})})};}
it('quotes current admin tier without inventing a neighbouring price',async()=>{
 const good=await signatureQuote(admin({'2':203}) as never,'azeitao-cheese',2,[]);
 expect('totalEur' in good&&good.totalEur).toBe(406);
 expect('reservationConfirmed' in good&&good.reservationConfirmed).toBe(false);
 const missing=await signatureQuote(admin({'8':127}) as never,'azeitao-cheese',2,[]);
 expect('totalEur' in missing).toBe(false);expect('error' in missing).toBe(true);
});
it('rejects a missing exact tier and invalid child ages',async()=>{
 expect('totalEur' in await signatureQuote(admin({}) as never,'azeitao-cheese',2,[])).toBe(false);
 expect('totalEur' in await signatureQuote(admin({'2':203}) as never,'azeitao-cheese',1,[19])).toBe(false);
});
