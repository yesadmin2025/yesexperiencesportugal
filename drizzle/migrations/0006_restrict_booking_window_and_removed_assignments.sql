REVOKE EXECUTE ON FUNCTION public.ops_booking_window(uuid) FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Guide reads own assignments" ON public.tour_assignments;
CREATE POLICY "Guide reads own assignments" ON public.tour_assignments FOR SELECT TO authenticated USING (guide_id = public.current_guide_id() AND removed_at IS NULL);