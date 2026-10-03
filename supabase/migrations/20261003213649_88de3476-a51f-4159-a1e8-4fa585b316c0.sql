CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  path text NOT NULL,
  referrer text,
  product_path text,
  event text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read visits" ON public.site_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX site_visits_created_idx ON public.site_visits (created_at DESC);