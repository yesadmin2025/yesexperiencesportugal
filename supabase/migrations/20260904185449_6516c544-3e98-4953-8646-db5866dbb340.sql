CREATE TABLE public.guide_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  guide_slug text NOT NULL,
  slot text NOT NULL,
  destination text NOT NULL,
  destination_kind text NOT NULL DEFAULT 'other',
  page_path text
);

CREATE INDEX guide_link_clicks_guide_idx ON public.guide_link_clicks (guide_slug, created_at DESC);

GRANT INSERT ON public.guide_link_clicks TO anon;
GRANT INSERT, SELECT ON public.guide_link_clicks TO authenticated;
GRANT ALL ON public.guide_link_clicks TO service_role;

ALTER TABLE public.guide_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a guide link click"
ON public.guide_link_clicks FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read guide link clicks"
ON public.guide_link_clicks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));