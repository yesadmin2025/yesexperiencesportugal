# Roadmap — Operations hub upgrade

## B. Data model (migration)
- [x] Extend `bookings` with operational columns (source, channel, external refs, start_time, pickup/dropoff, pax_breakdown, language, payment_status, amount_paid, assigned_guide_id, notes, inclusions/exclusions/extras, source_raw_payload, sync_status, last_synced_at, cancelled_at, review_required/reason)
- [x] `booking_ingestion_log` (audit: parser result, action, matched booking, reason)
- [x] `booking_ingestion_candidates` (needs-review queue)
- [x] GRANTs + RLS admin-only on new tables

## C/D. Email ingestion
- [x] Deterministic Bókun parser (new booking / cancellation)
- [x] Deterministic direct sent-voucher parser (multi-booking, pre-confirmation vs fully paid)
- [x] Non-booking email rejection rules
- [x] Dedupe ladder: external ref → gmail message id → thread+date+tour → email+date+product
- [x] Gmail scan server route (server-side auth only)

## A/E. Admin UI
- [x] Bookings hub: calendar + list toggle, search, filters, badges
- [x] Booking detail: grouped sections + quick actions
- [x] Needs Review inbox with approve / match / ignore / edit

## F. Guide briefing
- [x] Structured, editable briefing from booking + tour source of truth (no money)

## G. Bókun API prep
- [x] Server-side service abstraction + disabled-until-credentials admin state

## H. Backfill
- [x] Admin dry-run + apply, 120-day email window, future tour dates only

## J. Tests
- [x] Bókun new booking, Bókun cancellation match, direct fully-paid, two-tour email, pre-confirm→paid update, inquiry ignored

## Blocked on owner
- [ ] Connect the Gmail account (read-only) that receives Bókun notifications and sends vouchers
- [ ] Bókun access key / secret / webhook secret (endpoint stays disabled until then)

## Stripe + email reconciliation (done, 23 Sep 2026)
- [x] Voucher/confirmation emails enrich the matching Stripe-paid reservation (ref → guest+date → paid shell with no date) instead of duplicating
- [x] Stripe authoritative for payment state, amount, currency and origin; email authoritative for operational detail
- [x] Cancelled/refunded reservations never reactivated by an older confirmation
- [x] Reconciliation tab: enriched / created / duplicate / skipped / conflict counts + paid reservations still missing operational detail
- [x] Tests: src/__tests__/booking-stripe-reconciliation.test.ts
- [ ] Blocked: connect the Google mailbox (read-only) before any real import
- [ ] Blocked: Bókun access key / secret / webhook secret for direct sync
