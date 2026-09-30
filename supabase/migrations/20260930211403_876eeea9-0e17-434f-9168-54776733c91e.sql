-- Assignments are final: the office assigns, guides are notified, no accept/decline.
ALTER TABLE public.ops_notifications ADD COLUMN IF NOT EXISTS emailed_at timestamptz;
ALTER TABLE public.ops_notifications ADD COLUMN IF NOT EXISTS email_status text;
-- Older notifications are history only; never email them retroactively.
UPDATE public.ops_notifications SET emailed_at = created_at, email_status = 'historical' WHERE emailed_at IS NULL;

-- Normalise active operational state; legacy timestamps stay as history.
UPDATE public.tour_assignments SET status = 'assigned'
  WHERE removed_at IS NULL AND status IN ('confirmed','declined','changed');

REVOKE EXECUTE ON FUNCTION public.guide_confirm_assignment(uuid) FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  EXECUTE (SELECT string_agg(format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure), '; ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'guide_decline_assignment');
END $$;

-- Material schedule change or cancellation on a booking with an active assignment.
CREATE OR REPLACE FUNCTION public.notify_assignment_schedule_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; w record; ttl text; cancelled boolean;
BEGIN
  SELECT * INTO a FROM public.tour_assignments WHERE booking_id = NEW.id AND removed_at IS NULL LIMIT 1;
  IF a.id IS NULL THEN RETURN NEW; END IF;
  ttl := COALESCE(NEW.tour_title, NEW.source_tour_id, 'Tour');
  cancelled := (NEW.status IN ('cancelled','refunded','failed') OR NEW.cancelled_at IS NOT NULL)
    AND NOT (OLD.status IN ('cancelled','refunded','failed') OR OLD.cancelled_at IS NOT NULL);
  IF cancelled THEN
    UPDATE public.tour_assignments SET removed_at = now(), status = 'removed' WHERE id = a.id;
    INSERT INTO public.ops_notifications(guide_id, booking_id, assignment_id, notification_type, title, message)
      VALUES (a.guide_id, NEW.id, a.id, 'assignment_removed', 'Tour removed from your schedule', ttl);
    INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, previous_value)
      VALUES (NEW.id, a.guide_id, auth.uid(), 'removed_on_cancel', jsonb_build_object('guide_id', a.guide_id));
    RETURN NEW;
  END IF;
  IF NEW.preferred_date IS DISTINCT FROM OLD.preferred_date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.pickup_location IS DISTINCT FROM OLD.pickup_location THEN
    IF NEW.preferred_date IS NOT NULL AND (NEW.preferred_date IS DISTINCT FROM OLD.preferred_date OR NEW.start_time IS DISTINCT FROM OLD.start_time) THEN
      SELECT * INTO w FROM public.ops_booking_window(NEW.id);
      UPDATE public.tour_assignments SET start_at = w.start_at, end_at = w.end_at, changed_at = now() WHERE id = a.id;
    ELSE
      UPDATE public.tour_assignments SET changed_at = now() WHERE id = a.id;
    END IF;
    INSERT INTO public.ops_notifications(guide_id, booking_id, assignment_id, notification_type, title, message)
      VALUES (a.guide_id, NEW.id, a.id, 'assignment_updated', 'Assignment updated', ttl);
    INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, previous_value, new_value)
      VALUES (NEW.id, a.guide_id, auth.uid(), 'assignment_updated',
        jsonb_build_object('date', OLD.preferred_date, 'time', OLD.start_time, 'pickup', OLD.pickup_location),
        jsonb_build_object('date', NEW.preferred_date, 'time', NEW.start_time, 'pickup', NEW.pickup_location));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_assignment_schedule_change ON public.bookings;
CREATE TRIGGER bookings_assignment_schedule_change
  AFTER UPDATE OF preferred_date, start_time, pickup_location, status, cancelled_at ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_schedule_change();

-- New notifications are queued for email (emailed_at NULL) by default.