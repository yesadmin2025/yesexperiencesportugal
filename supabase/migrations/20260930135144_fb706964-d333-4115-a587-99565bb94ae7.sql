ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- A signed-in person without a guide profile asks to join; stays inactive until the office approves.
CREATE OR REPLACE FUNCTION public.guide_request_access(_name text, _phone text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE em text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF length(trim(coalesce(_name,''))) < 2 THEN RAISE EXCEPTION 'Please enter your full name'; END IF;
  SELECT lower(email) INTO em FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF em IS NULL THEN RAISE EXCEPTION 'Please confirm your email first'; END IF;
  IF EXISTS (SELECT 1 FROM public.guides WHERE user_id = auth.uid() OR lower(email) = em) THEN RETURN 'pending'; END IF;
  INSERT INTO public.guides(name, email, phone, active, user_id, approval_status, notes)
    VALUES (left(trim(_name),120), em, NULLIF(left(trim(coalesce(_phone,'')),40),''), false, auth.uid(), 'pending', 'Self sign-up — awaiting approval');
  RETURN 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.guide_access_pending()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.guides WHERE user_id = auth.uid() AND NOT active AND approval_status = 'pending')
$$;

-- Least-busy free guide: fewest active tours within ±14 days, trying each until one fits.
CREATE OR REPLACE FUNCTION public.ops_auto_assign_guide(_booking_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; g record;
BEGIN
  IF NOT public.is_ops_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.tour_assignments WHERE booking_id = _booking_id AND removed_at IS NULL) THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = _booking_id AND preferred_date IS NOT NULL
    AND status NOT IN ('cancelled','refunded','failed') AND cancelled_at IS NULL) THEN RETURN NULL; END IF;
  SELECT * INTO w FROM public.ops_booking_window(_booking_id);
  FOR g IN
    SELECT gd.id, (SELECT count(*) FROM public.tour_assignments a WHERE a.guide_id = gd.id AND a.removed_at IS NULL
      AND a.start_at BETWEEN w.start_at - interval '14 days' AND w.start_at + interval '14 days') AS load
    FROM public.guides gd WHERE gd.active AND gd.approval_status = 'approved'
    ORDER BY load, gd.name
  LOOP
    BEGIN
      PERFORM public.ops_assign_guide(_booking_id, g.id);
      RETURN g.id;
    EXCEPTION WHEN others THEN CONTINUE;
    END;
  END LOOP;
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.guide_request_access(text, text), public.guide_access_pending(), public.ops_auto_assign_guide(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guide_request_access(text, text), public.guide_access_pending(), public.ops_auto_assign_guide(uuid) TO authenticated;