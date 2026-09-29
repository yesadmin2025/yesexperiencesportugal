CREATE OR REPLACE FUNCTION public.public_fully_booked_dates(_from date, _to date)
RETURNS SETOF date
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH days AS (
    SELECT d::date AS d FROM generate_series(_from, LEAST(_to, _from + 400), interval '1 day') d
  ), g AS (
    SELECT id FROM public.guides WHERE active
  ), total AS (SELECT count(*) AS n FROM g)
  SELECT days.d FROM days, total
  WHERE total.n > 0 AND (
    (SELECT count(*) FROM g WHERE
       EXISTS (SELECT 1 FROM public.tour_assignments a WHERE a.guide_id = g.id AND a.removed_at IS NULL
               AND tstzrange(a.start_at, a.end_at) && tstzrange((days.d::timestamp) AT TIME ZONE 'Europe/Lisbon', ((days.d + 1)::timestamp) AT TIME ZONE 'Europe/Lisbon'))
    OR EXISTS (SELECT 1 FROM public.guide_availability v WHERE v.guide_id = g.id AND v.status IN ('unavailable','vacation')
               AND tstzrange(v.start_at, v.end_at) && tstzrange((days.d::timestamp) AT TIME ZONE 'Europe/Lisbon', ((days.d + 1)::timestamp) AT TIME ZONE 'Europe/Lisbon'))
    OR EXISTS (SELECT 1 FROM public.guide_recurring_availability r WHERE r.guide_id = g.id AND r.status = 'unavailable'
               AND r.weekday = extract(dow FROM days.d)::int)
    )
    +
    (SELECT count(*) FROM public.bookings b WHERE b.preferred_date::date = days.d AND b.status = 'paid' AND b.cancelled_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.tour_assignments a WHERE a.booking_id = b.id AND a.removed_at IS NULL))
  ) >= total.n;
$$;
REVOKE ALL ON FUNCTION public.public_fully_booked_dates(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_fully_booked_dates(date, date) TO anon, authenticated, service_role;