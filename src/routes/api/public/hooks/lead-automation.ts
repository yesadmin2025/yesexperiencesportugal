import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';
export const Route=createFileRoute('/api/public/hooks/lead-automation')({server:{handlers:{POST:async({request})=>{
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
 const secret=process.env['SUPABASE_SERVICE_ROLE_KEY'];const internal=process.env['EMAIL_INTERNAL_SECRET'];
 if(!token||(!secret||token!==secret)&&(!internal||token!==internal))return Response.json({error:'Unauthorized'},{status:401});
 const parsed=z.object({jobId:z.string().uuid().optional(),daily:z.boolean().optional()}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:'Invalid request'},{status:400});
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {runLeadJob,enqueueDailySummary}=await import('@/lib/lead-assistant/worker.server');
 try {
  if(parsed.data.jobId)return Response.json(await runLeadJob(supabaseAdmin,parsed.data.jobId));
  if(parsed.data.daily)return Response.json(await enqueueDailySummary(supabaseAdmin));
  return Response.json({error:'Action missing'},{status:400});
 }catch(e){console.error('lead_automation_failed',e instanceof Error?e.message:'Unknown failure');return Response.json({error:'Automation stopped; review its saved status.'},{status:503});}
}}}});
