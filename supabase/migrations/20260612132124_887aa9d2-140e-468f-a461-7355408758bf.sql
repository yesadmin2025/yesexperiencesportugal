ALTER TABLE public.studio_v3_leads DROP CONSTRAINT studio_v3_leads_status_chk;
ALTER TABLE public.studio_v3_leads ADD CONSTRAINT studio_v3_leads_status_chk
  CHECK (status = ANY (ARRAY['requested'::text, 'contacted'::text, 'closed'::text, 'spam'::text, 'saved'::text]));