CREATE TABLE IF NOT EXISTS public.booking_repair_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  repair_batch text NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  source text NOT NULL,
  outcome text NOT NULL DEFAULT 'applied',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_repair_log TO authenticated;
GRANT ALL ON public.booking_repair_log TO service_role;
ALTER TABLE public.booking_repair_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read repair log" ON public.booking_repair_log;
CREATE POLICY "Admins read repair log" ON public.booking_repair_log FOR SELECT TO authenticated USING (public.is_ops_admin());
CREATE INDEX IF NOT EXISTS booking_repair_log_booking_idx ON public.booking_repair_log(booking_id);

-- The mirror column can only ever equal the active assignment's guide.
CREATE OR REPLACE FUNCTION public.enforce_assigned_guide_mirror()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.assigned_guide_id := NULL;
  ELSIF NEW.assigned_guide_id IS DISTINCT FROM OLD.assigned_guide_id THEN
    NEW.assigned_guide_id := (SELECT guide_id FROM public.tour_assignments
      WHERE booking_id = NEW.id AND removed_at IS NULL LIMIT 1);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bookings_enforce_guide_mirror ON public.bookings;
CREATE TRIGGER bookings_enforce_guide_mirror BEFORE INSERT OR UPDATE OF assigned_guide_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assigned_guide_mirror();

-- One-time, idempotent repair of legacy mirror-only guides. No notifications.
DO $$
DECLARE r record; w record; new_id uuid;
BEGIN
  FOR r IN
    SELECT b.id, b.assigned_guide_id, b.preferred_date, b.start_time, g.id AS gid
    FROM public.bookings b LEFT JOIN public.guides g ON g.id = b.assigned_guide_id
    WHERE b.assigned_guide_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.tour_assignments t WHERE t.booking_id = b.id AND t.removed_at IS NULL)
  LOOP
    IF r.gid IS NULL OR r.preferred_date IS NULL THEN
      INSERT INTO public.booking_repair_log(booking_id, repair_batch, field, old_value, source, outcome, note)
      VALUES (r.id, 'phase1a-guide', 'tour_assignments', r.assigned_guide_id::text, 'bookings.assigned_guide_id', 'needs_manual_repair',
        CASE WHEN r.gid IS NULL THEN 'guide no longer exists' ELSE 'booking has no tour date' END);
      CONTINUE;
    END IF;
    BEGIN
      SELECT * INTO w FROM public.ops_booking_window(r.id);
      INSERT INTO public.tour_assignments(booking_id, guide_id, start_at, end_at, assigned_by)
        VALUES (r.id, r.gid, w.start_at, w.end_at, NULL) RETURNING id INTO new_id;
      INSERT INTO public.booking_repair_log(booking_id, repair_batch, field, old_value, new_value, source, note)
      VALUES (r.id, 'phase1a-guide', 'tour_assignments', NULL, new_id::text, 'bookings.assigned_guide_id',
        'guide ' || r.gid || '; window ' || w.start_at || ' → ' || w.end_at || CASE WHEN nullif(trim(r.start_time),'') IS NULL THEN ' (no start time: whole day)' ELSE '' END);
    EXCEPTION WHEN others THEN
      INSERT INTO public.booking_repair_log(booking_id, repair_batch, field, old_value, source, outcome, note)
      VALUES (r.id, 'phase1a-guide', 'tour_assignments', r.assigned_guide_id::text, 'bookings.assigned_guide_id', 'needs_manual_repair', SQLERRM);
    END;
  END LOOP;
END $$;