CREATE TABLE public.studio_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  visit_key text NOT NULL UNIQUE,
  tour_id text,
  title text NOT NULL,
  duration text,
  per_pax_eur integer,
  guests integer,
  date_label text,
  pickup text
);
GRANT SELECT ON public.studio_proposals TO authenticated;
GRANT ALL ON public.studio_proposals TO service_role;
ALTER TABLE public.studio_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view studio proposals" ON public.studio_proposals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_studio_proposals_created ON public.studio_proposals(created_at DESC);