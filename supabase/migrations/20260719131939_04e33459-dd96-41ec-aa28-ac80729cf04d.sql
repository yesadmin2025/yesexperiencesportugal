
-- Remove the security-definer view flagged by the linter
DROP VIEW IF EXISTS public.tour_reviews_public;

-- Re-create as an invoker-rights view (safe)
CREATE VIEW public.tour_reviews_public
WITH (security_invoker = true) AS
SELECT
  id, tour_id, source, rating, title, body,
  reviewer_name, reviewer_country, source_url,
  is_first_party, verified, is_featured,
  published_at, language
FROM public.tour_reviews
WHERE is_published = true
  AND moderation_status = 'approved';

-- Restore anon SELECT, but only on the safe (non-moderation) columns
GRANT SELECT
  (id, tour_id, source, rating, title, body,
   reviewer_name, reviewer_country, source_url,
   is_first_party, verified, is_featured,
   is_published, published_at, language)
  ON public.tour_reviews TO anon;

GRANT SELECT ON public.tour_reviews_public TO anon, authenticated;

-- Recreate the public read policy so the invoker-rights view + column grants work
DROP POLICY IF EXISTS "Public can read published reviews" ON public.tour_reviews;
CREATE POLICY "Public can read published reviews" ON public.tour_reviews
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND moderation_status = 'approved');
