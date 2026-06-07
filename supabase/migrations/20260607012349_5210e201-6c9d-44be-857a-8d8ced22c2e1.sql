
CREATE TABLE public.studio_v3_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_title text,
  skeleton_tour_key text,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  intent text NOT NULL DEFAULT 'book',
  status text NOT NULL DEFAULT 'requested',
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  contact_note text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_v3_leads_intent_chk CHECK (intent IN ('book','refine')),
  CONSTRAINT studio_v3_leads_status_chk CHECK (status IN ('requested','contacted','closed','spam')),
  CONSTRAINT studio_v3_leads_name_len CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  CONSTRAINT studio_v3_leads_email_len CHECK (char_length(contact_email) BETWEEN 3 AND 255),
  CONSTRAINT studio_v3_leads_phone_len CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 40),
  CONSTRAINT studio_v3_leads_note_len CHECK (contact_note IS NULL OR char_length(contact_note) <= 2000),
  CONSTRAINT studio_v3_leads_title_len CHECK (journey_title IS NULL OR char_length(journey_title) <= 200),
  CONSTRAINT studio_v3_leads_tourkey_len CHECK (skeleton_tour_key IS NULL OR char_length(skeleton_tour_key) <= 120)
);

GRANT INSERT ON public.studio_v3_leads TO anon, authenticated;
GRANT ALL ON public.studio_v3_leads TO service_role;

ALTER TABLE public.studio_v3_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead; no public read/update/delete.
CREATE POLICY "Anyone can submit a Studio V3 lead"
  ON public.studio_v3_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TRIGGER studio_v3_leads_set_updated_at
  BEFORE UPDATE ON public.studio_v3_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX studio_v3_leads_created_at_idx ON public.studio_v3_leads (created_at DESC);
