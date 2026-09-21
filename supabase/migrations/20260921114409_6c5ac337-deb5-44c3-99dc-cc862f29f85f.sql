-- Harden the confirmed-email helper used by the bookings read policy.
CREATE OR REPLACE FUNCTION private.current_user_confirmed_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND auth.uid() IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND u.deleted_at IS NULL
  LIMIT 1
$function$;

-- The helper takes no arguments and only ever resolves the caller's own
-- verified identity; restrict who may call it anyway.
REVOKE ALL ON FUNCTION private.current_user_confirmed_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_confirmed_email() FROM anon;
GRANT EXECUTE ON FUNCTION private.current_user_confirmed_email() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_confirmed_email() TO service_role;

-- Fail closed if the helper ever returns NULL or an empty value.
DROP POLICY IF EXISTS "Verified users can read their own bookings" ON public.bookings;
CREATE POLICY "Verified users can read their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND customer_email IS NOT NULL
  AND private.current_user_confirmed_email() IS NOT NULL
  AND lower(customer_email) = private.current_user_confirmed_email()
);