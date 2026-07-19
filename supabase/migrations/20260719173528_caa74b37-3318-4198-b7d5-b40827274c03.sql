
CREATE TABLE public.tour_operating_rules (
  tour_id text PRIMARY KEY,
  weekdays int[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  blackout_dates date[] NOT NULL DEFAULT ARRAY[]::date[],
  min_lead_hours int NOT NULL DEFAULT 24,
  cutoff_local_time time,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tour_operating_rules TO anon, authenticated;
GRANT ALL ON public.tour_operating_rules TO service_role;

ALTER TABLE public.tour_operating_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read operating rules"
  ON public.tour_operating_rules
  FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.touch_tour_operating_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tour_operating_rules_touch
  BEFORE UPDATE ON public.tour_operating_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_tour_operating_rules();
