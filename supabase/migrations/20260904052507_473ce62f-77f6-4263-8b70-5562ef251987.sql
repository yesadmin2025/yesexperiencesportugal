CREATE TABLE public.studio_composable_stops (
  stop_id text NOT NULL PRIMARY KEY,
  region text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  pricing_unit text NOT NULL DEFAULT 'per_person',
  min_guests integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT false,
  notes text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT studio_composable_stops_price_nonneg CHECK (price_cents >= 0),
  CONSTRAINT studio_composable_stops_min_guests CHECK (min_guests >= 1),
  CONSTRAINT studio_composable_stops_unit CHECK (pricing_unit IN ('per_person','per_group','per_vehicle','fixed'))
);

GRANT SELECT ON public.studio_composable_stops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_composable_stops TO authenticated;
GRANT ALL ON public.studio_composable_stops TO service_role;

ALTER TABLE public.studio_composable_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active priced composable stops"
  ON public.studio_composable_stops
  FOR SELECT
  TO anon, authenticated
  USING (active = true AND price_cents > 0);

CREATE POLICY "Admins can read all composable stops"
  ON public.studio_composable_stops
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert composable stops"
  ON public.studio_composable_stops
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update composable stops"
  ON public.studio_composable_stops
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete composable stops"
  ON public.studio_composable_stops
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX studio_composable_stops_region_idx ON public.studio_composable_stops (region);

CREATE TRIGGER studio_composable_stops_set_updated_at
  BEFORE UPDATE ON public.studio_composable_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();