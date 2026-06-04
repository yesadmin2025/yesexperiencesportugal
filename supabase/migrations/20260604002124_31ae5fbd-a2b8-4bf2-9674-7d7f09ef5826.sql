-- Make studio_drafts access model explicit: deny all anon/authenticated access.
-- The table is server-only and is accessed exclusively via the service role
-- (which bypasses RLS). Adding explicit restrictive-style deny policies
-- documents intent and prevents accidental exposure if grants change later.

REVOKE ALL ON public.studio_drafts FROM anon, authenticated;
GRANT ALL ON public.studio_drafts TO service_role;

CREATE POLICY "Deny all client SELECT on studio_drafts"
  ON public.studio_drafts FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all client INSERT on studio_drafts"
  ON public.studio_drafts FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny all client UPDATE on studio_drafts"
  ON public.studio_drafts FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny all client DELETE on studio_drafts"
  ON public.studio_drafts FOR DELETE
  TO anon, authenticated
  USING (false);