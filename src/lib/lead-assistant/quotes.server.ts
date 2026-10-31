import { publicSignatureTours } from '@/data/signatureTours';
import { calculateUnifiedPrice, type PriceTiersEUR } from '@/lib/checkout/unified-pricing';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
export const assistantCatalogue=()=>publicSignatureTours.map(t=>({id:t.id,title:t.title,url:`https://yesexperiencesportugal.com/tours/${t.id}`}));
export async function signatureQuote(admin:SupabaseClient<Database>,tourId:string,adults:number,minorAges:number[]) {
 const tour=publicSignatureTours.find(t=>t.id===tourId);
 if(!tour||!Number.isInteger(adults)||adults<1||adults+minorAges.length>8||minorAges.some(a=>!Number.isInteger(a)||a<0||a>17))return {error:'Please use the existing booking page for this group.'};
 const {data,error}=await admin.from('tour_price_tiers').select('tiers,updated_at').eq('tour_id',tourId).maybeSingle();
 if(error||!data)return {error:'Current approved prices could not be verified. No amount has been quoted.',url:`https://yesexperiencesportugal.com/tours/${tour.id}`};
 const tiers=data.tiers as unknown as PriceTiersEUR;
 const pricing=calculateUnifiedPrice(tour,adults,minorAges,{[tour.id]:tiers});
 if(!pricing)return {error:'No approved price for this composition.',url:`https://yesexperiencesportugal.com/tours/${tour.id}`};
 return {tour:tour.title,adults,minorAges,totalEur:pricing.totalEur,currency:'EUR',priceUpdatedAt:data.updated_at,reservationConfirmed:false,availability:'Not checked: select a date on the existing booking page. Payment and date checks are required before confirmation.',url:`https://yesexperiencesportugal.com/tours/${tour.id}`};
}
