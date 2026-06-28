-- Fail-closed RESTRICTIVE policy: authenticated non-admins cannot read builder_journeys directly.
-- Share-link access happens via server functions using the service-role client, which bypasses RLS.
CREATE POLICY "Authenticated non-admins cannot select builder_journeys"
ON public.builder_journeys
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));