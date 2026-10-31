CREATE OR REPLACE FUNCTION public.claim_lead_job(_id uuid) RETURNS SETOF public.lead_automation_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target public.lead_automation_jobs;
BEGIN
 SELECT * INTO target FROM public.lead_automation_jobs WHERE id=_id;
 IF target.conversation_id IS NOT NULL THEN
 PERFORM pg_advisory_xact_lock(hashtextextended(target.conversation_id::text,0));
 IF EXISTS(SELECT 1 FROM public.lead_automation_jobs WHERE conversation_id=target.conversation_id AND id<>_id AND state IN ('running','uncertain')) THEN RETURN; END IF;
 END IF;
 RETURN QUERY UPDATE public.lead_automation_jobs SET state='running',lease_until=now()+interval '10 minutes',lease_token=gen_random_uuid(),attempts=attempts+1 WHERE id=_id AND state='pending' AND available_at<=now() RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.claim_lead_job(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lead_job(uuid) TO service_role;