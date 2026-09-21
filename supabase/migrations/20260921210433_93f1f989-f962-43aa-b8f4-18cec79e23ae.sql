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
    AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND u.is_anonymous IS NOT TRUE
    AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND btrim(u.email) <> ''
    AND u.deleted_at IS NULL
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION private.current_user_confirmed_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_confirmed_email() TO authenticated, service_role;