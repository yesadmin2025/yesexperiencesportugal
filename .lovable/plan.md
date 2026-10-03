# Booking safety net + live conversion tracking

## What already works (checked)
- Every paid booking already emails the client (receipt) and the private admin inbox ("internal-booking"). Last 30 days: 72 admin alerts sent, 33 client receipts sent.
- Every lead (contact, proposals, Studio, booking requests) already emails the admin inbox: 304 sent.
- Gap found: 2 client receipts failed permanently and 1 was blocked (suppressed) — nobody was told.

So the pipeline exists; the plan closes the "lost booking" holes and adds the conversion view.

## 1. No booking can be silently lost
- Daily safety check: compare every paid Stripe booking with the email log. If a client receipt or admin alert is missing or failed, resend once, and if it still fails, show a red alert in Admin Operations.
- "Email status" line on each booking detail page (client: sent / failed / blocked; admin: sent) with a "Resend confirmation" button.
- Resolve the 3 current failed/blocked receipts: show them to you so you can resend or contact the guest.

## 2. Admin "Conversions" page (live site only)
Mobile-first page under More, period filter (7 / 30 / 90 days):
- Visitors (unique) → Started a booking (opened checkout / Studio reserve) → Leads (forms sent) → Paid reservations.
- Conversion rates: visitor → lead, visitor → paid, lead → paid.
- Revenue paid and average booking value.
- Breakdown by path: Signature, Studio/Tailor, Travel Designer, Moments, Corporate.
- Top pages that lead to bookings.
- Counts only the live domain; previews, test payments and admin visits excluded.

## Technical details
- New table `site_visits` (anonymous hashed visitor id, path, referrer, product path, created_at); insert via a public server route with rate limit, no PII; admin-only SELECT via `has_role`. GRANTs + RLS in migration.
- Visit beacon fires once per page view from __root on production hostnames only, respects reduced data (no cookies; localStorage random id).
- Funnel aggregation in an admin server function (`requireSupabaseAuth` + admin role) reading bookings (paid, Stripe live), lead tables and `site_visits`.
- Reconciliation: cron server route `/api/public/cron/email-reconcile` (secret-verified) joining paid bookings with `email_send_log` (dedup by message_id), re-enqueueing via existing templates with the same idempotency keys, raising `ops_notifications` on failure.
- No changes to prices, Stripe, checkout logic, email templates' content or brand.
- Nothing published until you ask.
