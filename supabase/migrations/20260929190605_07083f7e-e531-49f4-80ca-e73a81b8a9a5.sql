CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vehicle_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vehicle_capacity integer;

CREATE OR REPLACE FUNCTION public.current_guide_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.guides WHERE user_id = auth.uid() AND active LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_ops_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;

-- Guides may read/update their own guide row
CREATE POLICY "Guide reads own profile" ON public.guides FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── Assignments ─────────────────────────────────────────────
CREATE TABLE public.tour_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  guide_viewed_at timestamptz,
  guide_confirmed_at timestamptz,
  changed_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (status IN ('assigned','confirmed','changed','removed'))
);
ALTER TABLE public.tour_assignments ADD CONSTRAINT tour_assignments_no_overlap
  EXCLUDE USING gist (guide_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (removed_at IS NULL);
CREATE UNIQUE INDEX tour_assignments_one_active_per_booking ON public.tour_assignments(booking_id) WHERE removed_at IS NULL;
CREATE INDEX tour_assignments_guide_idx ON public.tour_assignments(guide_id, start_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_assignments TO authenticated;
GRANT ALL ON public.tour_assignments TO service_role;
ALTER TABLE public.tour_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assignments" ON public.tour_assignments FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide reads own assignments" ON public.tour_assignments FOR SELECT TO authenticated USING (guide_id = public.current_guide_id());
CREATE TRIGGER tour_assignments_updated BEFORE UPDATE ON public.tour_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Availability ────────────────────────────────────────────
CREATE TABLE public.guide_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (status IN ('available','unavailable','vacation','partial'))
);
CREATE INDEX guide_availability_idx ON public.guide_availability(guide_id, start_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_availability TO authenticated;
GRANT ALL ON public.guide_availability TO service_role;
ALTER TABLE public.guide_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage availability" ON public.guide_availability FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide manages own availability" ON public.guide_availability FOR ALL TO authenticated USING (guide_id = public.current_guide_id()) WITH CHECK (guide_id = public.current_guide_id());
CREATE TRIGGER guide_availability_updated BEFORE UPDATE ON public.guide_availability FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guide_recurring_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '00:00',
  end_time time NOT NULL DEFAULT '23:59',
  status text NOT NULL CHECK (status IN ('available','unavailable')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_recurring_availability TO authenticated;
GRANT ALL ON public.guide_recurring_availability TO service_role;
ALTER TABLE public.guide_recurring_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recurring" ON public.guide_recurring_availability FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide manages own recurring" ON public.guide_recurring_availability FOR ALL TO authenticated USING (guide_id = public.current_guide_id()) WITH CHECK (guide_id = public.current_guide_id());
CREATE TRIGGER guide_recurring_updated BEFORE UPDATE ON public.guide_recurring_availability FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A guide cannot drop an assigned tour by marking themselves unavailable.
CREATE OR REPLACE FUNCTION public.guard_guide_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_ops_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.status IN ('unavailable','vacation') AND EXISTS (
    SELECT 1 FROM public.tour_assignments a WHERE a.guide_id = NEW.guide_id AND a.removed_at IS NULL
      AND tstzrange(a.start_at, a.end_at) && tstzrange(NEW.start_at, NEW.end_at)) THEN
    RAISE EXCEPTION 'You have a tour assigned in this period. Use "Report an issue" instead.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER guide_availability_guard BEFORE INSERT OR UPDATE ON public.guide_availability FOR EACH ROW EXECUTE FUNCTION public.guard_guide_availability();

-- ── Notes ───────────────────────────────────────────────────
CREATE TABLE public.operational_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.tour_assignments(id) ON DELETE SET NULL,
  note text NOT NULL CHECK (length(note) BETWEEN 1 AND 4000),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','important','critical')),
  notify_guide boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operational_notes_booking_idx ON public.operational_notes(booking_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_notes TO authenticated;
GRANT ALL ON public.operational_notes TO service_role;
ALTER TABLE public.operational_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notes" ON public.operational_notes FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide reads notes of own tours" ON public.operational_notes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tour_assignments a WHERE a.booking_id = operational_notes.booking_id AND a.removed_at IS NULL AND a.guide_id = public.current_guide_id()));
CREATE TRIGGER operational_notes_updated BEFORE UPDATE ON public.operational_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Notifications ───────────────────────────────────────────
CREATE TABLE public.ops_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.tour_assignments(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  title text NOT NULL,
  message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_notifications_guide_idx ON public.ops_notifications(guide_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_notifications TO authenticated;
GRANT ALL ON public.ops_notifications TO service_role;
ALTER TABLE public.ops_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notifications" ON public.ops_notifications FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide reads own notifications" ON public.ops_notifications FOR SELECT TO authenticated USING (guide_id = public.current_guide_id());

-- ── Issue reports ───────────────────────────────────────────
CREATE TABLE public.guide_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.guide_issue_reports TO authenticated;
GRANT ALL ON public.guide_issue_reports TO service_role;
ALTER TABLE public.guide_issue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage issues" ON public.guide_issue_reports FOR ALL TO authenticated USING (public.is_ops_admin()) WITH CHECK (public.is_ops_admin());
CREATE POLICY "Guide reads own issues" ON public.guide_issue_reports FOR SELECT TO authenticated USING (guide_id = public.current_guide_id());

-- ── Activity log ────────────────────────────────────────────
CREATE TABLE public.operational_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operational_activity_log_created_idx ON public.operational_activity_log(created_at DESC);
GRANT SELECT ON public.operational_activity_log TO authenticated;
GRANT ALL ON public.operational_activity_log TO service_role;
ALTER TABLE public.operational_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity" ON public.operational_activity_log FOR SELECT TO authenticated USING (public.is_ops_admin());

-- ── Sync bookings.assigned_guide_id ─────────────────────────
CREATE OR REPLACE FUNCTION public.sync_booking_assigned_guide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bookings b SET assigned_guide_id = (
    SELECT guide_id FROM public.tour_assignments WHERE booking_id = NEW.booking_id AND removed_at IS NULL LIMIT 1)
  WHERE b.id = NEW.booking_id;
  RETURN NEW;
END $$;
CREATE TRIGGER tour_assignments_sync AFTER INSERT OR UPDATE ON public.tour_assignments FOR EACH ROW EXECUTE FUNCTION public.sync_booking_assigned_guide();

-- ── Admin RPCs ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ops_booking_window(_booking_id uuid, OUT start_at timestamptz, OUT end_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; t time;
BEGIN
  SELECT preferred_date, start_time INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.preferred_date IS NULL THEN RAISE EXCEPTION 'This booking has no tour date.'; END IF;
  BEGIN t := NULLIF(trim(b.start_time), '')::time; EXCEPTION WHEN others THEN t := NULL; END;
  IF t IS NULL THEN
    start_at := (b.preferred_date::timestamp) AT TIME ZONE 'Europe/Lisbon';
    end_at := ((b.preferred_date + 1)::timestamp) AT TIME ZONE 'Europe/Lisbon';
  ELSE
    start_at := (b.preferred_date + t) AT TIME ZONE 'Europe/Lisbon';
    end_at := start_at + interval '8 hours';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ops_assign_guide(_booking_id uuid, _guide_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; old record; new_id uuid; ttl text; unavailable boolean;
BEGIN
  IF NOT public.is_ops_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO w FROM public.ops_booking_window(_booking_id);
  SELECT COALESCE(tour_title, source_tour_id, 'Tour') INTO ttl FROM public.bookings WHERE id = _booking_id;
  SELECT EXISTS (SELECT 1 FROM public.guide_availability v WHERE v.guide_id = _guide_id
    AND v.status IN ('unavailable','vacation') AND tstzrange(v.start_at, v.end_at) && tstzrange(w.start_at, w.end_at)) INTO unavailable;
  IF unavailable THEN RAISE EXCEPTION 'This guide is marked unavailable for this tour.'; END IF;
  SELECT * INTO old FROM public.tour_assignments WHERE booking_id = _booking_id AND removed_at IS NULL FOR UPDATE;
  IF old.id IS NOT NULL THEN
    IF old.guide_id = _guide_id THEN RETURN old.id; END IF;
    UPDATE public.tour_assignments SET removed_at = now(), status = 'removed' WHERE id = old.id;
    INSERT INTO public.ops_notifications(guide_id, booking_id, assignment_id, notification_type, title, message)
      VALUES (old.guide_id, _booking_id, old.id, 'assignment_removed', 'Tour removed from your schedule', ttl);
  END IF;
  BEGIN
    INSERT INTO public.tour_assignments(booking_id, guide_id, start_at, end_at, assigned_by)
      VALUES (_booking_id, _guide_id, w.start_at, w.end_at, auth.uid()) RETURNING id INTO new_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This guide already has another tour at this time.';
  END;
  INSERT INTO public.ops_notifications(guide_id, booking_id, assignment_id, notification_type, title, message)
    VALUES (_guide_id, _booking_id, new_id, 'assignment_new', 'New tour assigned', ttl);
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, previous_value, new_value)
    VALUES (_booking_id, _guide_id, auth.uid(), CASE WHEN old.id IS NULL THEN 'assigned' ELSE 'reassigned' END,
      CASE WHEN old.id IS NULL THEN NULL ELSE jsonb_build_object('guide_id', old.guide_id) END,
      jsonb_build_object('guide_id', _guide_id));
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.ops_remove_assignment(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old record;
BEGIN
  IF NOT public.is_ops_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO old FROM public.tour_assignments WHERE booking_id = _booking_id AND removed_at IS NULL FOR UPDATE;
  IF old.id IS NULL THEN RETURN; END IF;
  UPDATE public.tour_assignments SET removed_at = now(), status = 'removed' WHERE id = old.id;
  UPDATE public.bookings SET assigned_guide_id = NULL WHERE id = _booking_id;
  INSERT INTO public.ops_notifications(guide_id, booking_id, assignment_id, notification_type, title)
    VALUES (old.guide_id, _booking_id, old.id, 'assignment_removed', 'Tour removed from your schedule');
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, previous_value)
    VALUES (_booking_id, old.guide_id, auth.uid(), 'removed', jsonb_build_object('guide_id', old.guide_id));
END $$;

CREATE OR REPLACE FUNCTION public.ops_add_note(_booking_id uuid, _note text, _priority text, _notify boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid; a record;
BEGIN
  IF NOT public.is_ops_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO a FROM public.tour_assignments WHERE booking_id = _booking_id AND removed_at IS NULL;
  INSERT INTO public.operational_notes(booking_id, assignment_id, note, priority, notify_guide, created_by)
    VALUES (_booking_id, a.id, _note, _priority, _notify, auth.uid()) RETURNING id INTO nid;
  IF _notify AND a.id IS NOT NULL THEN
    UPDATE public.tour_assignments SET status = 'changed', changed_at = now() WHERE id = a.id;
    INSERT INTO public.ops_notifications(guide_id, booking_id, assignment_id, notification_type, title, message)
      VALUES (a.guide_id, _booking_id, a.id, 'note_' || _priority, 'Tour update', left(_note, 300));
  END IF;
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, new_value)
    VALUES (_booking_id, a.guide_id, auth.uid(), 'note_added', jsonb_build_object('priority', _priority));
  RETURN nid;
END $$;

-- ── Guide RPCs (safe columns only) ──────────────────────────
CREATE OR REPLACE FUNCTION public.guide_my_tours(_from date DEFAULT (now() - interval '30 days')::date, _to date DEFAULT (now() + interval '365 days')::date)
RETURNS TABLE(assignment_id uuid, booking_id uuid, tour_title text, tour_date date, start_time text, start_at timestamptz, end_at timestamptz,
  guests integer, pax_breakdown jsonb, language text, pickup_location text, dropoff_location text, guest_first_name text,
  client_notes text, status text, guide_viewed_at timestamptz, guide_confirmed_at timestamptz, changed_at timestamptz, booking_cancelled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, b.id, COALESCE(b.tour_title, b.source_tour_id), b.preferred_date, b.start_time, a.start_at, a.end_at,
    b.guests, b.pax_breakdown, b.language, b.pickup_location, b.dropoff_location, split_part(COALESCE(b.customer_name,''), ' ', 1),
    b.client_notes, a.status, a.guide_viewed_at, a.guide_confirmed_at, a.changed_at, (b.status IN ('cancelled','refunded') OR b.cancelled_at IS NOT NULL)
  FROM public.tour_assignments a JOIN public.bookings b ON b.id = a.booking_id
  WHERE a.guide_id = public.current_guide_id() AND a.removed_at IS NULL
    AND a.start_at >= _from::timestamptz AND a.start_at < (_to + 1)::timestamptz
  ORDER BY a.start_at
$$;

CREATE OR REPLACE FUNCTION public.guide_mark_viewed(_assignment_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.tour_assignments SET guide_viewed_at = COALESCE(guide_viewed_at, now())
  WHERE id = _assignment_id AND guide_id = public.current_guide_id() AND removed_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.guide_confirm_assignment(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  UPDATE public.tour_assignments SET guide_confirmed_at = now(), guide_viewed_at = COALESCE(guide_viewed_at, now()), status = 'confirmed'
  WHERE id = _assignment_id AND guide_id = public.current_guide_id() AND removed_at IS NULL RETURNING * INTO a;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action) VALUES (a.booking_id, a.guide_id, auth.uid(), 'guide_confirmed');
END $$;

CREATE OR REPLACE FUNCTION public.guide_report_issue(_booking_id uuid, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.current_guide_id(); rid uuid;
BEGIN
  IF g IS NULL THEN RAISE EXCEPTION 'Not a guide'; END IF;
  IF _booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tour_assignments WHERE booking_id = _booking_id AND guide_id = g AND removed_at IS NULL) THEN
    RAISE EXCEPTION 'Not found';
  END IF;
  INSERT INTO public.guide_issue_reports(guide_id, booking_id, message) VALUES (g, _booking_id, _message) RETURNING id INTO rid;
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, new_value) VALUES (_booking_id, g, auth.uid(), 'issue_reported', jsonb_build_object('message', left(_message, 300)));
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.guide_mark_notification_read(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ops_notifications SET read_at = COALESCE(read_at, now()), delivered_at = COALESCE(delivered_at, now())
  WHERE id = _id AND guide_id = public.current_guide_id()
$$;

CREATE OR REPLACE FUNCTION public.guide_update_profile(_phone text, _whatsapp text, _languages text[], _vehicle_available boolean, _vehicle_capacity integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.guides SET phone = left(_phone, 40), whatsapp = left(_whatsapp, 40), languages = COALESCE(_languages, '{}'),
    vehicle_available = COALESCE(_vehicle_available, false), vehicle_capacity = _vehicle_capacity
  WHERE id = public.current_guide_id()
$$;

-- Link a guide's login automatically when their confirmed email matches.
CREATE OR REPLACE FUNCTION public.guide_claim_account()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE em text; gid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT lower(email) INTO em FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF em IS NULL THEN RETURN NULL; END IF;
  UPDATE public.guides SET user_id = auth.uid() WHERE user_id IS NULL AND active AND lower(email) = em RETURNING id INTO gid;
  RETURN COALESCE(gid, public.current_guide_id());
END $$;

REVOKE ALL ON FUNCTION public.ops_assign_guide(uuid, uuid), public.ops_remove_assignment(uuid), public.ops_add_note(uuid, text, text, boolean),
  public.guide_my_tours(date, date), public.guide_mark_viewed(uuid), public.guide_confirm_assignment(uuid), public.guide_report_issue(uuid, text),
  public.guide_mark_notification_read(uuid), public.guide_update_profile(text, text, text[], boolean, integer), public.guide_claim_account(),
  public.ops_booking_window(uuid), public.current_guide_id(), public.is_ops_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_assign_guide(uuid, uuid), public.ops_remove_assignment(uuid), public.ops_add_note(uuid, text, text, boolean),
  public.guide_my_tours(date, date), public.guide_mark_viewed(uuid), public.guide_confirm_assignment(uuid), public.guide_report_issue(uuid, text),
  public.guide_mark_notification_read(uuid), public.guide_update_profile(text, text, text[], boolean, integer), public.guide_claim_account(),
  public.ops_booking_window(uuid), public.current_guide_id(), public.is_ops_admin() TO authenticated;