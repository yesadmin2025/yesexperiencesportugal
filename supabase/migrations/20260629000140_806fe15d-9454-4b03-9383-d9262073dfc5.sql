CREATE TABLE public.tour_external_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('viator','tripadvisor','getyourguide','google')),
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_count INTEGER NOT NULL CHECK (review_count >= 0),
  source_url TEXT,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, source)
);

CREATE INDEX idx_tour_external_ratings_tour ON public.tour_external_ratings(tour_id);

GRANT SELECT ON public.tour_external_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tour_external_ratings TO authenticated;
GRANT ALL ON public.tour_external_ratings TO service_role;

ALTER TABLE public.tour_external_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads external ratings"
  ON public.tour_external_ratings FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins manage external ratings"
  ON public.tour_external_ratings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tour_external_ratings_updated_at
  BEFORE UPDATE ON public.tour_external_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Global aggregate view including external counts
CREATE OR REPLACE VIEW public.global_review_aggregate AS
WITH ext AS (
  SELECT
    COALESCE(SUM(review_count), 0)::int AS external_count,
    CASE WHEN COALESCE(SUM(review_count),0) > 0
      THEN ROUND((SUM(rating * review_count) / NULLIF(SUM(review_count),0))::numeric, 2)
      ELSE NULL
    END AS external_weighted_avg
  FROM public.tour_external_ratings
),
fp AS (
  SELECT
    COUNT(*) FILTER (WHERE is_first_party AND is_published)::int AS first_party_count,
    ROUND(AVG(rating) FILTER (WHERE is_first_party AND is_published)::numeric, 2) AS first_party_avg
  FROM public.tour_reviews
)
SELECT
  (ext.external_count + fp.first_party_count) AS total_reviews,
  CASE WHEN (ext.external_count + fp.first_party_count) > 0 THEN
    ROUND(((COALESCE(ext.external_weighted_avg,0) * ext.external_count
          + COALESCE(fp.first_party_avg,0) * fp.first_party_count)
          / NULLIF(ext.external_count + fp.first_party_count, 0))::numeric, 2)
    ELSE NULL
  END AS average_rating,
  ext.external_count,
  ext.external_weighted_avg,
  fp.first_party_count,
  fp.first_party_avg
FROM ext, fp;

ALTER VIEW public.global_review_aggregate SET (security_invoker = on);
GRANT SELECT ON public.global_review_aggregate TO anon, authenticated;