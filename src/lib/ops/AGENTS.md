# Ops data rules

- Admin reads guide, payment state and details completeness only through `booking-read-model.ts` (guide = active `tour_assignments`; `bookings.assigned_guide_id` is a DB-enforced mirror); one mapping keeps every screen and the Guide App in agreement.
- Vouchers & Payments tabs group by payment only via `payment-reconciliation.ts`; completeness is a separate status, never a mixed bucket.
- Empty pickup/date/tour fields are filled only by the `bookings_normalize_details` DB trigger when all of a booking's own sources agree, logged in `booking_repair_log`; one rule covers every writer.
