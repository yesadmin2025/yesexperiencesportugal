# Roadmap — Operations hub upgrade

## B. Data model (migration)
- [ ] Extend `bookings` with operational columns (source, channel, external refs, start_time, pickup/dropoff, pax_breakdown, language, payment_status, amount_paid, assigned_guide_id, notes, inclusions/exclusions/extras, source_raw_payload, sync_status, last_synced_at, cancelled_at, review_required/reason)
- [ ] `booking_ingestion_log` (audit: parser result, action, matched booking, reason)
- [ ] `booking_ingestion_candidates` (needs-review queue)
- [ ] GRANTs + RLS admin-only on new tables

## C/D. Email ingestion
- [ ] Deterministic Bókun parser (new booking / cancellation)
- [ ] Deterministic direct sent-voucher parser (multi-booking, pre-confirmation vs fully paid)
- [ ] Non-booking email rejection rules
- [ ] Dedupe ladder: external ref → gmail message id → thread+date+tour → email+date+product
- [ ] Gmail scan server route (server-side auth only)

## A/E. Admin UI
- [ ] Bookings hub: calendar + list toggle, search, filters, badges
- [ ] Booking detail: grouped sections + quick actions
- [ ] Needs Review inbox with approve / match / ignore / edit

## F. Guide briefing
- [ ] Structured, editable briefing from booking + tour source of truth (no money)

## G. Bókun API prep
- [ ] Server-side service abstraction + disabled-until-credentials admin state

## H. Backfill
- [ ] Admin dry-run + apply, 120-day email window, future tour dates only

## J. Tests
- [ ] Bókun new booking, Bókun cancellation match, direct fully-paid, two-tour email, pre-confirm→paid update, inquiry ignored
