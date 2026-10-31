CREATE TABLE public.lead_automation_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dedupe_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK (kind IN ('whatsapp_reply','daily_summary')),
 conversation_id uuid REFERENCES public.whatsapp_conversations(id),
 message_id uuid REFERENCES public.whatsapp_messages(id),
 report_date date,
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','running','completed','failed','uncertain')),
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 lease_token uuid,
 output jsonb,
 provider_message_id text,
 error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
GRANT SELECT ON public.lead_automation_jobs TO authenticated;
GRANT ALL ON public.lead_automation_jobs TO service_role;
ALTER TABLE public.lead_automation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads automation jobs" ON public.lead_automation_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX lead_automation_pending_idx ON public.lead_automation_jobs(state,available_at);
CREATE TABLE public.lead_appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id),
 message_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_messages(id),
 requested_time text NOT NULL,
 state text NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','confirmed','cancelled')),
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,UPDATE ON public.lead_appointments TO authenticated;
GRANT ALL ON public.lead_appointments TO service_role;
ALTER TABLE public.lead_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads call requests" ON public.lead_appointments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates call requests" ON public.lead_appointments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.whatsapp_conversations ADD COLUMN assistant_handoff_at timestamptz, ADD COLUMN assistant_handoff_reason text;
CREATE TABLE public.lead_automation_control (
 id text PRIMARY KEY CHECK (id IN ('whatsapp','daily_summary')),
 enabled boolean NOT NULL DEFAULT false,
 pause_reason text,
 recipient_email text,
 run_hour integer NOT NULL DEFAULT 9 CHECK (run_hour BETWEEN 0 AND 23),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,UPDATE,INSERT ON public.lead_automation_control TO authenticated;
GRANT ALL ON public.lead_automation_control TO service_role;
ALTER TABLE public.lead_automation_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages lead automation" ON public.lead_automation_control FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.claim_lead_job(_id uuid) RETURNS SETOF public.lead_automation_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY UPDATE public.lead_automation_jobs SET state='running',lease_until=now()+interval '10 minutes',lease_token=gen_random_uuid(),attempts=attempts+1 WHERE id=_id AND state='pending' AND available_at<=now() RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.claim_lead_job(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lead_job(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.enqueue_whatsapp_assistant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.direction='inbound' AND NEW.ingest_source='webhook' AND NEW.body IS NOT NULL AND NEW.conversation_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.lead_automation_control WHERE id='whatsapp' AND enabled AND pause_reason IS NULL) AND NOT EXISTS(SELECT 1 FROM public.whatsapp_conversations WHERE id=NEW.conversation_id AND assistant_handoff_at IS NOT NULL) THEN
 INSERT INTO public.lead_automation_jobs(dedupe_key,kind,conversation_id,message_id) VALUES('wa:'||NEW.provider_message_id,'whatsapp_reply',NEW.conversation_id,NEW.id) ON CONFLICT(dedupe_key) DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_whatsapp_assistant() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER whatsapp_assistant_enqueue AFTER INSERT ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION public.enqueue_whatsapp_assistant();