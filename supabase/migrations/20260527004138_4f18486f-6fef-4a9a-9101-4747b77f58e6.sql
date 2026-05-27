
-- studio_v2_bookings: admin-only access (writes go through service role)
CREATE POLICY "Admins can read studio_v2_bookings"
  ON public.studio_v2_bookings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert studio_v2_bookings"
  ON public.studio_v2_bookings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update studio_v2_bookings"
  ON public.studio_v2_bookings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete studio_v2_bookings"
  ON public.studio_v2_bookings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- studio_v2_sessions: admin-only (token-scoped reads go through server fn with service role)
CREATE POLICY "Admins can read studio_v2_sessions"
  ON public.studio_v2_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert studio_v2_sessions"
  ON public.studio_v2_sessions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update studio_v2_sessions"
  ON public.studio_v2_sessions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete studio_v2_sessions"
  ON public.studio_v2_sessions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- studio_v2_predictions: admin-only (server-mediated only)
CREATE POLICY "Admins can read studio_v2_predictions"
  ON public.studio_v2_predictions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert studio_v2_predictions"
  ON public.studio_v2_predictions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update studio_v2_predictions"
  ON public.studio_v2_predictions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete studio_v2_predictions"
  ON public.studio_v2_predictions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is enabled on all three
ALTER TABLE public.studio_v2_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_v2_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_v2_predictions ENABLE ROW LEVEL SECURITY;
