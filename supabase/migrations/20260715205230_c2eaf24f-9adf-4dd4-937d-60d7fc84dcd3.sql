-- Remove permissive anon INSERT policies for builder references.
-- Uploads now go exclusively through the uploadBuilderReference server
-- function, which uses the service-role client and enforces that the
-- storage path is scoped to the caller's own session_id.

DROP POLICY IF EXISTS "Anon can upload builder references" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can insert builder reference uploads" ON public.builder_reference_uploads;