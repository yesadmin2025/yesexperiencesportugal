import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
export const getLeadAutomation=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data:allowed,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(error||allowed!==true)throw new Error('Forbidden');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const [settings,jobs,calls,handoffs]=await Promise.all([
 supabaseAdmin.from('lead_automation_control').select('*'),supabaseAdmin.from('lead_automation_jobs').select('id,kind,state,report_date,error,created_at').order('created_at',{ascending:false}).limit(20),
 supabaseAdmin.from('lead_appointments').select('id,conversation_id,requested_time,state,starts_at').eq('state','requested').order('created_at').limit(50),
 supabaseAdmin.from('whatsapp_conversations').select('id,display_name,phone_e164,assistant_handoff_reason').not('assistant_handoff_at','is',null).limit(50)]);
 if([settings,jobs,calls,handoffs].some(r=>r.error))throw new Error('Could not load automation');
 return {settings:settings.data??[],jobs:jobs.data??[],calls:calls.data??[],handoffs:handoffs.data??[]};
});
export const resumeConversation=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
 const {data:allowed,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(error||allowed!==true)throw new Error('Forbidden');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const r=await supabaseAdmin.from('whatsapp_conversations').update({assistant_handoff_at:null,assistant_handoff_reason:null}).eq('id',data.id);if(r.error)throw new Error('Could not resume');return {ok:true};
});
export const updateCallRequest=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid(),action:z.enum(['confirmed','cancelled']),startsAt:z.string().datetime({offset:true}).nullable()}).parse(v)).handler(async({data,context})=>{
 const {data:allowed,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(error||allowed!==true)throw new Error('Forbidden');
 if(data.action==='confirmed'&&!data.startsAt)throw new Error('Choose a confirmed time first');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const r=await supabaseAdmin.from('lead_appointments').update({state:data.action,starts_at:data.startsAt}).eq('id',data.id);if(r.error)throw new Error('Could not update call');return {ok:true};
});
