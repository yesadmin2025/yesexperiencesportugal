-- Slice A closure: recoverable confirming lease
ALTER TABLE public.booking_quotes
  ADD COLUMN IF NOT EXISTS confirming_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bokun_reservation_status text;

-- Extend state constraint to include 'confirming'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_quotes_state_check') THEN
    ALTER TABLE public.booking_quotes DROP CONSTRAINT booking_quotes_state_check;
  END IF;
  ALTER TABLE public.booking_quotes
    ADD CONSTRAINT booking_quotes_state_check
    CHECK (state IN ('quoted','reserved','checkout-created','paid','confirming','confirmed','expired','cancelled','failed'));
END $$;

CREATE INDEX IF NOT EXISTS booking_quotes_confirming_lease_idx
  ON public.booking_quotes (state, confirming_at)
  WHERE state = 'confirming';