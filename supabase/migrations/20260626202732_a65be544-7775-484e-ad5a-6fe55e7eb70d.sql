
-- Fix #1: Drop weaker overlapping INSERT policy on storage.objects for builder-references.
-- Keep the strict regex-validated policy only.
DROP POLICY IF EXISTS "Anyone can upload to their builder session folder" ON storage.objects;

-- Fix #2: Set immutable search_path on pgmq wrapper functions.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
