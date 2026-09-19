ALTER TABLE public.studio_composable_stops
  ADD COLUMN duration_minutes integer,
  ADD COLUMN open_from time without time zone,
  ADD COLUMN open_to time without time zone,
  ADD COLUMN fixed_start_times time without time zone[] NOT NULL DEFAULT '{}'::time[];

ALTER TABLE public.studio_composable_stops
  ADD CONSTRAINT studio_composable_stops_duration_valid
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 15 AND 720),
  ADD CONSTRAINT studio_composable_stops_window_complete
    CHECK ((open_from IS NULL) = (open_to IS NULL)),
  ADD CONSTRAINT studio_composable_stops_window_ordered
    CHECK (open_from IS NULL OR open_to > open_from);

CREATE OR REPLACE FUNCTION public.validate_studio_composable_stop_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  session_time time without time zone;
BEGIN
  IF NEW.open_from IS NOT NULL THEN
    FOREACH session_time IN ARRAY NEW.fixed_start_times LOOP
      IF session_time < NEW.open_from OR session_time >= NEW.open_to THEN
        RAISE EXCEPTION 'fixed_start_times must be inside the operating window';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER studio_composable_stops_validate_schedule
  BEFORE INSERT OR UPDATE OF open_from, open_to, fixed_start_times
  ON public.studio_composable_stops
  FOR EACH ROW EXECUTE FUNCTION public.validate_studio_composable_stop_schedule();
