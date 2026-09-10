GRANT SELECT, UPDATE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;

CREATE POLICY "Admins can read booking requests"
ON public.booking_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update booking requests"
ON public.booking_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));