DROP FUNCTION IF EXISTS public.guide_my_tours(date, date);
CREATE FUNCTION public.guide_my_tours(_from date DEFAULT ((now() - '30 days'::interval))::date, _to date DEFAULT ((now() + '365 days'::interval))::date)
 RETURNS TABLE(assignment_id uuid, booking_id uuid, tour_title text, source_tour_id text, tour_date date, start_time text, start_at timestamptz, end_at timestamptz, guests integer, pax_breakdown jsonb, language text, pickup_location text, dropoff_location text, guest_first_name text, guest_full_name text, guest_phone text, guest_email text, itinerary jsonb, included_items jsonb, client_notes text, status text, guide_viewed_at timestamptz, guide_confirmed_at timestamptz, changed_at timestamptz, booking_cancelled boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT a.id, b.id, COALESCE(b.tour_title, b.source_tour_id), b.source_tour_id::text, b.preferred_date, b.start_time, a.start_at, a.end_at,
    b.guests, b.pax_breakdown, b.language, b.pickup_location, b.dropoff_location, split_part(COALESCE(b.customer_name,''), ' ', 1),
    NULLIF(b.customer_name, ''), NULLIF(b.customer_phone, ''), NULLIF(b.customer_email, ''),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'order', CASE WHEN s->>'order' ~ '^\d{1,4}$' THEN (s->>'order')::int ELSE ord::int END,
        'label', left(s->>'label', 160),
        'note', NULLIF(left(COALESCE(s->>'note',''), 240), ''),
        'durationMinutes', CASE WHEN s->>'durationMinutes' ~ '^\d{1,4}$' THEN (s->>'durationMinutes')::int END
      ) ORDER BY CASE WHEN s->>'order' ~ '^\d{1,4}$' THEN (s->>'order')::int ELSE ord::int END)
      FROM jsonb_array_elements(CASE
        WHEN jsonb_typeof(b.booking_details->'snapshot'->'itinerary') = 'array' AND jsonb_array_length(b.booking_details->'snapshot'->'itinerary') > 0 THEN b.booking_details->'snapshot'->'itinerary'
        WHEN jsonb_typeof(b.booking_details->'itinerary') = 'array' THEN b.booking_details->'itinerary'
        ELSE '[]'::jsonb END) WITH ORDINALITY AS t(s, ord)
      WHERE jsonb_typeof(s) = 'object' AND s ? 'label'
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(to_jsonb(left(v, 200)))
      FROM jsonb_array_elements_text(CASE
        WHEN jsonb_typeof(b.booking_details->'snapshot'->'includedItems') = 'array' AND jsonb_array_length(b.booking_details->'snapshot'->'includedItems') > 0 THEN b.booking_details->'snapshot'->'includedItems'
        WHEN jsonb_typeof(b.booking_details->'includedItems') = 'array' AND jsonb_array_length(b.booking_details->'includedItems') > 0 THEN b.booking_details->'includedItems'
        ELSE NULL END) AS v
    ), (SELECT jsonb_agg(to_jsonb(left(v, 200))) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(b.inclusions) = 'array' THEN b.inclusions ELSE '[]'::jsonb END) AS v), '[]'::jsonb),
    b.client_notes, a.status, a.guide_viewed_at, a.guide_confirmed_at, a.changed_at, (b.status IN ('cancelled','refunded') OR b.cancelled_at IS NOT NULL)
  FROM public.tour_assignments a JOIN public.bookings b ON b.id = a.booking_id
  WHERE a.guide_id = public.current_guide_id() AND a.removed_at IS NULL
    AND a.start_at >= _from::timestamptz AND a.start_at < (_to + 1)::timestamptz
  ORDER BY a.start_at
$function$;
REVOKE ALL ON FUNCTION public.guide_my_tours(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guide_my_tours(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_guide_availability()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d date;
BEGIN
  IF public.is_ops_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP NOT IN ('INSERT','UPDATE') THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NEW.status IN ('unavailable','vacation') AND EXISTS (
    SELECT 1 FROM public.tour_assignments a WHERE a.guide_id = NEW.guide_id AND a.removed_at IS NULL
      AND tstzrange(a.start_at, a.end_at) && tstzrange(NEW.start_at, NEW.end_at)) THEN
    RAISE EXCEPTION 'You have a tour assigned in this period. Use "Report an issue" instead.';
  END IF;
  IF NEW.status IN ('morning','afternoon','custom','partial') THEN
    d := (NEW.start_at AT TIME ZONE 'Europe/Lisbon')::date;
    IF EXISTS (
      SELECT 1 FROM public.tour_assignments a WHERE a.guide_id = NEW.guide_id AND a.removed_at IS NULL
        AND tstzrange(a.start_at, a.end_at) && tstzrange((d::timestamp AT TIME ZONE 'Europe/Lisbon'), ((d + 1)::timestamp AT TIME ZONE 'Europe/Lisbon'))
        AND NOT (a.start_at >= NEW.start_at AND a.end_at <= NEW.end_at)) THEN
      RAISE EXCEPTION 'Your assigned tour that day falls outside these hours. Use "Report an issue" instead.';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.ops_assign_guide(_booking_id uuid, _guide_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE w record; old record; new_id uuid; ttl text; unavailable boolean; has_partial boolean; fits boolean;
BEGIN
  IF NOT public.is_ops_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO w FROM public.ops_booking_window(_booking_id);
  SELECT COALESCE(tour_title, source_tour_id, 'Tour') INTO ttl FROM public.bookings WHERE id = _booking_id;
  SELECT EXISTS (SELECT 1 FROM public.guide_availability v WHERE v.guide_id = _guide_id
    AND v.status IN ('unavailable','vacation') AND tstzrange(v.start_at, v.end_at) && tstzrange(w.start_at, w.end_at)) INTO unavailable;
  IF unavailable THEN RAISE EXCEPTION 'This guide is marked unavailable for this tour.'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.guide_availability v WHERE v.guide_id = _guide_id
      AND v.status IN ('morning','afternoon','custom','partial')
      AND (v.start_at AT TIME ZONE 'Europe/Lisbon')::date = (w.start_at AT TIME ZONE 'Europe/Lisbon')::date),
    EXISTS (SELECT 1 FROM public.guide_availability v WHERE v.guide_id = _guide_id
      AND v.status IN ('morning','afternoon','custom','partial')
      AND v.start_at <= w.start_at AND v.end_at >= w.end_at)
    INTO has_partial, fits;
  IF has_partial AND NOT fits THEN RAISE EXCEPTION 'This tour falls outside the guide available hours.'; END IF;
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
END $function$;