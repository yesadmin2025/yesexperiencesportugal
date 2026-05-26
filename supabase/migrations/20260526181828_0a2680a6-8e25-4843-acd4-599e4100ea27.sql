
CREATE TABLE public.builder_route_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_key text NOT NULL,
  to_key text NOT NULL,
  distance_km numeric NOT NULL,
  drive_minutes integer NOT NULL,
  polyline text NOT NULL,
  provider text NOT NULL DEFAULT 'osrm',
  created_at timestamptz NOT NULL DEFAULT now(),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_key, to_key)
);

CREATE INDEX idx_builder_route_cache_pair ON public.builder_route_cache (from_key, to_key);

GRANT SELECT ON public.builder_route_cache TO anon, authenticated;
GRANT ALL ON public.builder_route_cache TO service_role;

ALTER TABLE public.builder_route_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read route cache"
  ON public.builder_route_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage route cache delete"
  ON public.builder_route_cache
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage route cache update"
  ON public.builder_route_cache
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
