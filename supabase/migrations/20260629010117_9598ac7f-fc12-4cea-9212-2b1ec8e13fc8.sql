-- Add moderation queue for scraped/external reviews
ALTER TABLE public.tour_reviews
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID,
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Constrain values
DO $$ BEGIN
  ALTER TABLE public.tour_reviews
    ADD CONSTRAINT tour_reviews_moderation_status_chk
    CHECK (moderation_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: any existing scraped (non-first-party) rows that are NOT published
-- should be in the pending queue; everything already visible stays approved.
UPDATE public.tour_reviews
  SET moderation_status = 'pending'
  WHERE is_first_party = FALSE
    AND is_published = FALSE
    AND moderation_status = 'approved';

-- Index for queue listing
CREATE INDEX IF NOT EXISTS tour_reviews_moderation_idx
  ON public.tour_reviews (moderation_status, created_at DESC)
  WHERE moderation_status = 'pending';

-- Keep first-party submissions auto-approved
CREATE OR REPLACE FUNCTION public.submit_first_party_review(_token text, _rating numeric, _title text, _body text, _reviewer_name text, _reviewer_country text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    is_first_party, verified, is_published, published_at,
    moderation_status, moderated_at
  ) VALUES (
    v_tok.tour_id, 'first_party', _rating, _title, _body,
    coalesce(_reviewer_name, v_tok.guest_name), _reviewer_country,
    TRUE, TRUE, TRUE, now(),
    'approved', now()
  )
  RETURNING id INTO v_review_id;

  UPDATE public.review_submission_tokens
  SET used_at = now()
  WHERE id = v_tok.id;

  RETURN v_review_id;
END;
$function$;