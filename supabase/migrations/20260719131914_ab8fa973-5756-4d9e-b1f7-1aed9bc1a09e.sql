
-- Drop broad public SELECT policy that exposed all columns
DROP POLICY IF EXISTS "Public can read published reviews" ON public.tour_reviews;

-- Revoke direct SELECT from anon on the base table
REVOKE SELECT ON public.tour_reviews FROM anon;

-- Admin SELECT policy so authenticated admins can still read everything
DROP POLICY IF EXISTS "Admins can read all reviews" ON public.tour_reviews;
CREATE POLICY "Admins can read all reviews" ON public.tour_reviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view: excludes moderation_notes, moderated_by, moderation_status, external_id, scraped_at, moderated_at
CREATE OR REPLACE VIEW public.tour_reviews_public
WITH (security_invoker = false) AS
SELECT
  id, tour_id, source, rating, title, body,
  reviewer_name, reviewer_country, source_url,
  is_first_party, verified, is_featured,
  published_at, language
FROM public.tour_reviews
WHERE is_published = true
  AND moderation_status = 'approved';

GRANT SELECT ON public.tour_reviews_public TO anon, authenticated;
