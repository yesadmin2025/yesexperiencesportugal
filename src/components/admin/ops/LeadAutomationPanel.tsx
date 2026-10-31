import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {getLeadAutomation,resumeConversation} from '@/lib/leadAutomation.functions';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {RefreshCw,MessageCircle} from 'lucide-react';
export function LeadAutomationPanel(){
 const load=useServerFn(getLeadAutomation);const resume=useServerFn(resumeConversation);
 const [data,setData]=useState<Awaited<ReturnType<typeof getLeadAutomation>>|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 async function refresh(){setBusy(true);try{setData(await load({}));setError(null);}catch(e){setError(e instanceof Error?e.message:'Could not load assistance');}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[]);
 return <section className="border-t border-border py-5 text-sm"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Lead assistance</h3><Button variant="ghost" size="icon" aria-label="Refresh lead assistance" title="Refresh" disabled={busy} onClick={()=>void refresh()}><RefreshCw className="size-4"/></Button></div>
 {error?<p className="text-destructive">{error}</p>:null}
 <dl className="mt-3 space-y-2">{(data?.settings??[]).map(s=><div key={s.id}><dt className="font-medium">{s.id==='whatsapp'?'WhatsApp assistant':'Morning summary'}</dt><dd className="text-muted-foreground">{s.pause_reason??(s.enabled?'Enabled':'Awaiting setup')}{s.id==='daily_summary'?` · ${s.recipient_email??''} · 09:00 Lisbon`:''}</dd></div>)}</dl>
 <h4 className="mt-5 font-medium">Waiting for you</h4><ul className="divide-y divide-border">{(data?.handoffs??[]).map(c=><li key={c.id} className="py-3"><p>{c.display_name??c.phone_e164}</p><p className="text-muted-foreground">{c.assistant_handoff_reason}</p><div className="mt-2 flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><a href={`https://wa.me/${c.phone_e164.replace(/^\+/,'')}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4"/>Open conversation</a></Button><Button variant="ghost" size="sm" disabled={busy} onClick={async()=>{try{await resume({data:{id:c.id}});await refresh();}catch(e){toast.error(e instanceof Error?e.message:'Could not resume');}}}>Return to assistant</Button></div></li>)}</ul>
 <h4 className="mt-5 font-medium">Call requests</h4><ul className="divide-y divide-border">{(data?.calls??[]).map(c=><li key={c.id} className="py-2">{c.requested_time}<span className="block text-muted-foreground">Awaiting your confirmation</span></li>)}</ul>
 <h4 className="mt-5 font-medium">Recent activity</h4><ul>{(data?.jobs??[]).map(j=><li key={j.id} className="py-2"><span>{j.kind==='daily_summary'?'Daily summary':'WhatsApp reply'} · {j.state}</span>{j.error?<p className="text-destructive break-words">{j.error}</p>:null}</li>)}</ul>
 </section>;
}
