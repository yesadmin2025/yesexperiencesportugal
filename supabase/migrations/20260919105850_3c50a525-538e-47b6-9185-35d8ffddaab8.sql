CREATE POLICY "Public can view editorial photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'editorial-photos');

CREATE POLICY "Admins can upload editorial photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'editorial-photos'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update editorial photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'editorial-photos'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'editorial-photos'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete editorial photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'editorial-photos'
  AND public.has_role(auth.uid(), 'admin')
);