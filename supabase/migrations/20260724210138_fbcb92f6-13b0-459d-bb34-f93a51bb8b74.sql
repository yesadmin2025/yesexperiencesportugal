
-- 1) Move current_user_confirmed_email to a private schema so it is not exposed via the API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.current_user_confirmed_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL
$$;

REVOKE ALL ON FUNCTION private.current_user_confirmed_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_user_confirmed_email() TO authenticated;

-- Repoint bookings policy at the private helper, then drop the public one.
DROP POLICY IF EXISTS "Verified users can read their own bookings" ON public.bookings;
CREATE POLICY "Verified users can read their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  lower(customer_email) = private.current_user_confirmed_email()
);

DROP FUNCTION IF EXISTS public.current_user_confirmed_email();

-- 2) Hide internal moderation columns on tour_reviews from anon/authenticated.
--    Admins keep full access via the "Admins can read all reviews" policy,
--    which runs as authenticated but only after has_role() passes; column
--    privileges are enforced by GRANT, so we revoke them from the general
--    authenticated/anon roles and re-grant only to service_role for admin
--    tooling that goes through the service key.
REVOKE SELECT (moderation_notes, moderated_by, moderated_at) ON public.tour_reviews FROM anon, authenticated;
GRANT SELECT (moderation_notes, moderated_by, moderated_at) ON public.tour_reviews TO service_role;
