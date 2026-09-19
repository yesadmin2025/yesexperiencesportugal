DROP POLICY IF EXISTS "Public can read active priced composable stops" ON public.studio_composable_stops;

CREATE POLICY "Public can read complete active composable stops"
  ON public.studio_composable_stops
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND price_cents > 0
    AND duration_minutes IS NOT NULL
    AND duration_minutes > 0
    AND (
      (open_from IS NOT NULL AND open_to IS NOT NULL)
      OR cardinality(fixed_start_times) > 0
    )
  );