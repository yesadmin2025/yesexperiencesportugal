-- 1. Normalize the confirmed-email helper (trim + lower on both sides).
CREATE OR REPLACE FUNCTION private.current_user_confirmed_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT lower(btrim(u.email))
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND auth.uid() IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND btrim(u.email) <> ''
    AND u.deleted_at IS NULL
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION private.current_user_confirmed_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_confirmed_email() FROM anon;
GRANT EXECUTE ON FUNCTION private.current_user_confirmed_email() TO authenticated, service_role;

DROP POLICY IF EXISTS "Verified users can read their own bookings" ON public.bookings;
CREATE POLICY "Verified users can read their own bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND customer_email IS NOT NULL
    AND private.current_user_confirmed_email() IS NOT NULL
    AND lower(btrim(customer_email)) = private.current_user_confirmed_email()
  );

-- 2. Studio V3 leads: no direct public writes. All inserts go through
-- trusted server functions using the service role.
DROP POLICY IF EXISTS "Anyone can submit a Studio V3 lead" ON public.studio_v3_leads;
REVOKE INSERT ON public.studio_v3_leads FROM anon, authenticated;
GRANT ALL ON public.studio_v3_leads TO service_role;