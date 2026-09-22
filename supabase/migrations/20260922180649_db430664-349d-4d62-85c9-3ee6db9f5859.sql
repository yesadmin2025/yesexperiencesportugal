-- 1. Enquiries are only written through the trusted server route (admin client),
--    so drop the open public insert rule.
DROP POLICY IF EXISTS "Anyone can submit a booking request" ON public.booking_requests;
REVOKE INSERT ON public.booking_requests FROM anon, authenticated;

-- 2. Guide link click logging stays open (anonymous analytics) but is now validated.
DROP POLICY IF EXISTS "Anyone can record a guide link click" ON public.guide_link_clicks;
CREATE POLICY "Guide link clicks accept validated rows"
ON public.guide_link_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  destination_kind IN ('signature','studio','guide','contact','other')
  AND char_length(guide_slug) BETWEEN 1 AND 160
  AND guide_slug ~ '^[a-z0-9/_-]+$'
  AND char_length(slot) BETWEEN 1 AND 80
  AND char_length(destination) BETWEEN 1 AND 240
  AND (page_path IS NULL OR (char_length(page_path) <= 240 AND page_path LIKE '/%'))
);

-- 3. Builder stops: the public site only needs active stops; admins keep full access.
DROP POLICY IF EXISTS "Anyone can read builder_stops" ON public.builder_stops;
CREATE POLICY "Public can read active builder_stops"
ON public.builder_stops
FOR SELECT
TO anon, authenticated
USING (is_active = true);
CREATE POLICY "Admins can read all builder_stops"
ON public.builder_stops
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Editorial photos are delivered by the server route with elevated access,
--    so no direct public read is needed on the private bucket.
DROP POLICY IF EXISTS "Public can view editorial photos" ON storage.objects;
CREATE POLICY "Admins can read editorial photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'editorial-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Tour photos: reads are bound to files that are actually referenced by a
--    published gallery row instead of the whole bucket.
DROP POLICY IF EXISTS "Public can view tour photos" ON storage.objects;
CREATE POLICY "Gallery tour photos are readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'tour-photos'
  AND EXISTS (
    SELECT 1 FROM public.tour_gallery_photos g WHERE g.storage_path = storage.objects.name
  )
);
CREATE POLICY "Admins can read tour photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'::app_role));