-- Drop table + its policies/triggers via CASCADE (all objects are Bokun-only)
DROP TABLE IF EXISTS public.tour_bokun_mapping CASCADE;

-- Drop supporting index before its column
DROP INDEX IF EXISTS public.bookings_bokun_status_idx;

-- bookings
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS bokun_status,
  DROP COLUMN IF EXISTS bokun_booking_id,
  DROP COLUMN IF EXISTS bokun_confirmation_code,
  DROP COLUMN IF EXISTS bokun_error,
  DROP COLUMN IF EXISTS bokun_last_attempt_at,
  DROP COLUMN IF EXISTS bokun_reservation_id,
  DROP COLUMN IF EXISTS bokun_base_subtotal_eur;

-- booking_add_ons
ALTER TABLE public.booking_add_ons
  DROP COLUMN IF EXISTS bokun_product_id,
  DROP COLUMN IF EXISTS bokun_option_id,
  DROP COLUMN IF EXISTS bokun_rate_id,
  DROP COLUMN IF EXISTS bokun_base_subtotal_eur,
  DROP COLUMN IF EXISTS bokun_release_result,
  DROP COLUMN IF EXISTS bokun_reservation_id,
  DROP COLUMN IF EXISTS bokun_reservation_status;

-- booking_quotes
ALTER TABLE public.booking_quotes
  DROP COLUMN IF EXISTS bokun_product_id,
  DROP COLUMN IF EXISTS bokun_option_id,
  DROP COLUMN IF EXISTS bokun_rate_id,
  DROP COLUMN IF EXISTS bokun_base_subtotal_eur,
  DROP COLUMN IF EXISTS bokun_release_result,
  DROP COLUMN IF EXISTS bokun_reservation_id,
  DROP COLUMN IF EXISTS bokun_reservation_status;