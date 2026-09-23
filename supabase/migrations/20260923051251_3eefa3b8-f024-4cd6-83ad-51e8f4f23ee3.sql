UPDATE public.bookings
SET source_channel = 'WEBSITE'
WHERE source_channel IS NULL AND source = 'WEBSITE';

UPDATE public.bookings
SET payment_status = CASE
  WHEN status = 'paid' THEN 'PAID'
  WHEN status = 'refunded' THEN 'REFUNDED'
  WHEN status IN ('pending', 'failed') THEN 'PENDING_PAYMENT'
  ELSE 'UNKNOWN'
END
WHERE payment_status IS NULL;

UPDATE public.bookings
SET amount_paid = amount_total
WHERE amount_paid IS NULL AND status = 'paid' AND amount_total IS NOT NULL;