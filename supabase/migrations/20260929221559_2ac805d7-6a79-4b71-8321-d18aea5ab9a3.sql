DROP FUNCTION IF EXISTS public.guide_my_tours(date, date);

CREATE FUNCTION public.guide_my_tours(_from date DEFAULT (now() - interval '30 days')::date, _to date DEFAULT (now() + interval '365 days')::date)
RETURNS TABLE(assignment_id uuid, booking_id uuid, tour_title text, tour_date date, start_time text, start_at timestamptz, end_at timestamptz,
  guests integer, pax_breakdown jsonb, language text, pickup_location text, dropoff_location text, guest_first_name text,
  guest_full_name text, guest_phone text, guest_email text,
  itinerary jsonb, included_items jsonb,
  client_notes text, status text, guide_viewed_at timestamptz, guide_confirmed_at timestamptz, changed_at timestamptz, booking_cancelled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, b.id, COALESCE(b.tour_title, b.source_tour_id), b.preferred_date, b.start_time, a.start_at, a.end_at,
    b.guests, b.pax_breakdown, b.language, b.pickup_location, b.dropoff_location, split_part(COALESCE(b.customer_name,''), ' ', 1),
    NULLIF(b.customer_name, ''), NULLIF(b.customer_phone, ''), NULLIF(b.customer_email, ''),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'order', COALESCE(NULLIF(s->>'order','')::int, ord),
        'label', left(s->>'label', 160),
        'note', NULLIF(left(COALESCE(s->>'note',''), 240), ''),
        'durationMinutes', NULLIF(s->>'durationMinutes','')::int
      ) ORDER BY COALESCE(NULLIF(s->>'order','')::int, ord))
      FROM jsonb_array_elements(COALESCE(b.booking_details->'itinerary', '[]'::jsonb)) WITH ORDINALITY AS t(s, ord)
      WHERE s ? 'label'
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(to_jsonb(left(v, 200)))
      FROM jsonb_array_elements_text(COALESCE(b.booking_details->'includedItems', '[]'::jsonb)) AS v
    ), CASE WHEN jsonb_typeof(b.inclusions) = 'array' THEN b.inclusions ELSE '[]'::jsonb END),
    b.client_notes, a.status, a.guide_viewed_at, a.guide_confirmed_at, a.changed_at, (b.status IN ('cancelled','refunded') OR b.cancelled_at IS NOT NULL)
  FROM public.tour_assignments a JOIN public.bookings b ON b.id = a.booking_id
  WHERE a.guide_id = public.current_guide_id() AND a.removed_at IS NULL
    AND a.start_at >= _from::timestamptz AND a.start_at < (_to + 1)::timestamptz
  ORDER BY a.start_at
$$;

REVOKE ALL ON FUNCTION public.guide_my_tours(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guide_my_tours(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_guide_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_ops_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.status IN ('unavailable','vacation','morning','afternoon','custom') AND EXISTS (
    SELECT 1 FROM public.tour_assignments a WHERE a.guide_id = NEW.guide_id AND a.removed_at IS NULL
      AND tstzrange(a.start_at, a.end_at) && tstzrange(NEW.start_at, NEW.end_at)) THEN
    RAISE EXCEPTION 'You have a tour assigned in this period. Use "Report an issue" instead.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;