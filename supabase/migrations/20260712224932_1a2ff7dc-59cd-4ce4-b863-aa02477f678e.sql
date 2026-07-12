ALTER TABLE public.booking_quotes
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS bokun_release_result jsonb;