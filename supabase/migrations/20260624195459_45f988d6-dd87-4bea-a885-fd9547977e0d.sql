ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS bokun_booking_id text,
  ADD COLUMN IF NOT EXISTS bokun_confirmation_code text,
  ADD COLUMN IF NOT EXISTS bokun_status text,
  ADD COLUMN IF NOT EXISTS bokun_error text,
  ADD COLUMN IF NOT EXISTS bokun_last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_bokun_status_idx ON public.bookings (bokun_status) WHERE bokun_status IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_session_id_uniq ON public.bookings (stripe_session_id) WHERE stripe_session_id IS NOT NULL;