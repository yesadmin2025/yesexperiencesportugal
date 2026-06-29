-- =========================================================================
-- TOUR REVIEWS
-- =========================================================================
CREATE TABLE public.tour_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('viator','tripadvisor','getyourguide','google','first_party')),
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL CHECK (length(body) >= 10 AND length(body) <= 4000),
  reviewer_name TEXT,
  reviewer_country TEXT,
  source_url TEXT,
  is_first_party BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tour_reviews_tour ON public.tour_reviews(tour_id) WHERE is_published;
CREATE INDEX idx_tour_reviews_published ON public.tour_reviews(published_at DESC) WHERE is_published;
CREATE INDEX idx_tour_reviews_source ON public.tour_reviews(source);
CREATE INDEX idx_tour_reviews_first_party ON public.tour_reviews(is_first_party) WHERE is_published;

GRANT SELECT ON public.tour_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tour_reviews TO authenticated;
GRANT ALL ON public.tour_reviews TO service_role;

ALTER TABLE public.tour_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published reviews"
  ON public.tour_reviews FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Admins can insert reviews"
  ON public.tour_reviews FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reviews"
  ON public.tour_reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
  ON public.tour_reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tour_reviews_updated_at
  BEFORE UPDATE ON public.tour_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- FIRST-PARTY REVIEW SUBMISSION TOKENS
-- =========================================================================
CREATE TABLE public.review_submission_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  booking_id UUID,
  tour_id TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_tokens_token ON public.review_submission_tokens(token) WHERE used_at IS NULL;

GRANT SELECT ON public.review_submission_tokens TO anon, authenticated;
GRANT ALL ON public.review_submission_tokens TO service_role;

ALTER TABLE public.review_submission_tokens ENABLE ROW LEVEL SECURITY;

-- No anon SELECT policy needed in practice — token lookup happens via SECURITY DEFINER RPC
CREATE POLICY "Admins read submission tokens"
  ON public.review_submission_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- FIRST-PARTY REVIEW SUBMISSION RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.submit_first_party_review(
  _token TEXT,
  _rating NUMERIC,
  _title TEXT,
  _body TEXT,
  _reviewer_name TEXT,
  _reviewer_country TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tok RECORD;
  v_review_id UUID;
BEGIN
  IF _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid rating';
  END IF;
  IF length(coalesce(_body,'')) < 10 OR length(_body) > 4000 THEN
    RAISE EXCEPTION 'invalid body length';
  END IF;

  SELECT * INTO v_tok
  FROM public.review_submission_tokens
  WHERE token = _token AND used_at IS NULL AND expires_at > now()
  LIMIT 1;

  IF v_tok IS NULL THEN
    RAISE EXCEPTION 'invalid or expired token';
  END IF;

  INSERT INTO public.tour_reviews(
    tour_id, source, rating, title, body,
    reviewer_name, reviewer_country,
    is_first_party, verified, is_published, published_at
  ) VALUES (
    v_tok.tour_id, 'first_party', _rating, _title, _body,
    coalesce(_reviewer_name, v_tok.guest_name), _reviewer_country,
    TRUE, TRUE, TRUE, now()
  )
  RETURNING id INTO v_review_id;

  UPDATE public.review_submission_tokens
  SET used_at = now()
  WHERE id = v_tok.id;

  RETURN v_review_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_first_party_review(TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

-- =========================================================================
-- AGGREGATE VIEWS
-- =========================================================================
CREATE OR REPLACE VIEW public.tour_review_stats AS
SELECT
  tour_id,
  COUNT(*)::int AS total_reviews,
  ROUND(AVG(rating)::numeric, 2) AS average_rating,
  COUNT(*) FILTER (WHERE is_first_party)::int AS first_party_count,
  ROUND(AVG(rating) FILTER (WHERE is_first_party)::numeric, 2) AS first_party_avg,
  COUNT(*) FILTER (WHERE source='viator')::int AS viator_count,
  COUNT(*) FILTER (WHERE source='tripadvisor')::int AS tripadvisor_count,
  COUNT(*) FILTER (WHERE source='getyourguide')::int AS getyourguide_count,
  COUNT(*) FILTER (WHERE source='google')::int AS google_count,
  MAX(published_at) AS last_review_at
FROM public.tour_reviews
WHERE is_published = TRUE
GROUP BY tour_id;

GRANT SELECT ON public.tour_review_stats TO anon, authenticated;

CREATE OR REPLACE VIEW public.global_review_stats AS
SELECT
  COUNT(*)::int AS total_reviews,
  ROUND(AVG(rating)::numeric, 2) AS average_rating,
  COUNT(*) FILTER (WHERE is_first_party)::int AS first_party_count,
  ROUND(AVG(rating) FILTER (WHERE is_first_party)::numeric, 2) AS first_party_avg,
  COUNT(DISTINCT tour_id)::int AS tours_with_reviews
FROM public.tour_reviews
WHERE is_published = TRUE;

GRANT SELECT ON public.global_review_stats TO anon, authenticated;