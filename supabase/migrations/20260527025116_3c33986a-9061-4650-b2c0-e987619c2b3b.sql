
-- Tighten builder reference uploads to prevent session-folder spoofing.
-- 1. DB INSERT policy: enforce file_path starts with session_id || '/'
DROP POLICY IF EXISTS "Anyone can insert builder reference uploads" ON public.builder_reference_uploads;
CREATE POLICY "Anyone can insert builder reference uploads"
ON public.builder_reference_uploads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) BETWEEN 8 AND 64
  AND file_size_bytes > 0
  AND file_size_bytes <= 10485760
  AND mime_type = ANY (ARRAY[
    'image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'
  ])
  -- file_path MUST start with "<session_id>/" so rows cannot reference
  -- another session's storage folder.
  AND file_path LIKE (session_id || '/%')
  AND length(file_path) <= 512
);

-- 2. Storage INSERT policy: require first folder segment to look like a
--    session id (8-64 chars, lowercase hex/alnum/dash/underscore). This
--    blocks uploads to arbitrary paths even before a DB row exists, so
--    they get swept by the daily cleanup of orphaned objects.
DROP POLICY IF EXISTS "Anon can upload builder references" ON storage.objects;
CREATE POLICY "Anon can upload builder references"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'builder-references'
  AND (storage.foldername(name))[1] ~ '^[a-zA-Z0-9_-]{8,64}$'
);
