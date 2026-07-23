-- Fix: previous policy referenced auth.users directly, which the `authenticated`
-- role cannot SELECT, so every signed-in read of public.bookings failed with
-- "permission denied for table users". Use a SECURITY DEFINER helper that
-- resolves the caller's confirmed email from auth.users on their behalf.

CREATE OR REPLACE FUNCTION public.current_user_confirmed_email()
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

REVOKE ALL ON FUNCTION public.current_user_confirmed_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_confirmed_email() TO authenticated;

DROP POLICY IF EXISTS "Verified users can read their own bookings" ON public.bookings;

CREATE POLICY "Verified users can read their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  lower(customer_email) = public.current_user_confirmed_email()
);
