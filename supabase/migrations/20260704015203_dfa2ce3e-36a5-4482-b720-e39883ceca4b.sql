-- 1) Pin search_path on the four email queue SECURITY DEFINER helpers
ALTER FUNCTION public.enqueue_email(text, jsonb)      SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.delete_email(text, bigint)      SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = 'public', 'pg_temp';

-- 2) These are internal helpers called by the queue processor with the
--    service role. Signed-in users must not be able to invoke them.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)      TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint)      TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;