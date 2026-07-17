
-- Public read of tour photos (bucket is private, so we allow SELECT via policy)
CREATE POLICY "Public can view tour photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'tour-photos');

CREATE POLICY "Admins can upload tour photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tour photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tour photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'::app_role));
