
-- Extend tour_reviews for scraped platform reviews
ALTER TABLE public.tour_reviews
  ADD COLUMN IF NOT EXISTS scraped_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

CREATE UNIQUE INDEX IF NOT EXISTS tour_reviews_source_external_id_unique
  ON public.tour_reviews (source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tour_reviews_tour_published_featured_idx
  ON public.tour_reviews (tour_id, is_published, is_featured, published_at DESC);

-- Audit table for scrape runs
CREATE TABLE IF NOT EXISTS public.tour_review_scrapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id text NOT NULL,
  source text NOT NULL,
  source_url text,
  status text NOT NULL,
  fetched_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tour_review_scrapes TO authenticated;
GRANT ALL ON public.tour_review_scrapes TO service_role;

ALTER TABLE public.tour_review_scrapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_scrapes" ON public.tour_review_scrapes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_scrapes" ON public.tour_review_scrapes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS tour_review_scrapes_tour_idx
  ON public.tour_review_scrapes (tour_id, created_at DESC);
