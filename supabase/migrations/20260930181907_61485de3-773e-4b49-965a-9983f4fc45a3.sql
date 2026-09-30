ALTER TABLE public.tour_assignments DROP CONSTRAINT IF EXISTS tour_assignments_status_check;
ALTER TABLE public.tour_assignments ADD CONSTRAINT tour_assignments_status_check CHECK (status IN ('assigned','confirmed','changed','removed','declined'));
ALTER TABLE public.tour_assignments ADD COLUMN IF NOT EXISTS guide_declined_at timestamptz, ADD COLUMN IF NOT EXISTS decline_reason text;

CREATE OR REPLACE FUNCTION public.guide_confirm_assignment(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  UPDATE public.tour_assignments SET guide_confirmed_at = now(), guide_declined_at = NULL, decline_reason = NULL,
    guide_viewed_at = COALESCE(guide_viewed_at, now()), status = 'confirmed'
  WHERE id = _assignment_id AND guide_id = public.current_guide_id() AND removed_at IS NULL RETURNING * INTO a;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action) VALUES (a.booking_id, a.guide_id, auth.uid(), 'guide_confirmed');
END $$;

CREATE OR REPLACE FUNCTION public.guide_decline_assignment(_assignment_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; r text := nullif(left(trim(coalesce(_reason,'')), 500), '');
BEGIN
  UPDATE public.tour_assignments SET status = 'declined', guide_declined_at = now(), guide_confirmed_at = NULL, decline_reason = r,
    guide_viewed_at = COALESCE(guide_viewed_at, now())
  WHERE id = _assignment_id AND guide_id = public.current_guide_id() AND removed_at IS NULL RETURNING * INTO a;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  INSERT INTO public.operational_activity_log(booking_id, guide_id, user_id, action, new_value)
    VALUES (a.booking_id, a.guide_id, auth.uid(), 'guide_declined', jsonb_build_object('reason', r));
  INSERT INTO public.guide_issue_reports(guide_id, booking_id, message)
    VALUES (a.guide_id, a.booking_id, 'Guide declined this tour' || coalesce(': ' || r, '.'));
END $$;
REVOKE ALL ON FUNCTION public.guide_decline_assignment(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.guide_decline_assignment(uuid, text) TO authenticated;