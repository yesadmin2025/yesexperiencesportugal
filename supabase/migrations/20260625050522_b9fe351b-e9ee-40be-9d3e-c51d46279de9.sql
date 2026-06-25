ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_details JSONB NULL,
  ADD COLUMN IF NOT EXISTS booking_details_completed_at TIMESTAMPTZ NULL;