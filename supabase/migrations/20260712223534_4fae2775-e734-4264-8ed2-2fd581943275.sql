
-- Slice A: Reservation spine — persist provisional Bókun reservation + state machine
-- fields on booking_quotes, and mirror reservation identifiers on bookings.

ALTER TABLE public.booking_quotes
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'quoted',
  ADD COLUMN IF NOT EXISTS bokun_reservation_id text,
  ADD COLUMN IF NOT EXISTS bokun_reservation_status text,
  ADD COLUMN IF NOT EXISTS bokun_base_subtotal_eur numeric(10,2),
  ADD COLUMN IF NOT EXISTS database_addon_subtotal_eur numeric(10,2),
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS last_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_quotes_state_check'
  ) THEN
    ALTER TABLE public.booking_quotes
      ADD CONSTRAINT booking_quotes_state_check
      CHECK (state IN ('quoted','reserved','checkout-created','paid','confirmed','expired','cancelled','failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_quotes_reservation
  ON public.booking_quotes(bokun_reservation_id)
  WHERE bokun_reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_quotes_stripe_session
  ON public.booking_quotes(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS bokun_reservation_id text,
  ADD COLUMN IF NOT EXISTS bokun_base_subtotal_eur numeric(10,2),
  ADD COLUMN IF NOT EXISTS database_addon_subtotal_eur numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_total_eur numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_bookings_quote_id
  ON public.bookings(quote_id)
  WHERE quote_id IS NOT NULL;
