# Admin + Guide App audit and remediation plan

Read-only audit, 30 Sep 2026. No code, data or publish changes were made.

## Key findings (verified)

1. **Two guide sources that disagree.** 17 bookings have `bookings.assigned_guide_id` set but no active `tour_assignments` row. Admin screens read the column; the Guide App reads `tour_assignments` (via `guide_my_tours`). So the office sees a guide the guide never sees. This is the main reason the Guide App seems unreliable.
2. **Payment status and booking completeness are mixed together.** "Paid, details missing" (`payment-reconciliation.ts`) means "payment found, but the tour date, tour, pickup or name is empty". It is not a payment-matching result. Most such bookings are Stripe checkouts where the tour details stayed in `metadata`/`booking_details` instead of the top-level columns. 41 rows have `booking_details` and 21 keep pickup in `metadata`.
3. **There is no voucher or payment record of its own.** A "payment" is just fields on the booking row (`stripe_session_id`, `payment_status`, `amount_paid`, `external_booking_ref`). A voucher email is either merged into the booking or filed in `booking_ingestion_candidates`, which is empty right now. The Unmatched / Suggested / Undo match flow described in the brief cannot exist without a payment record. The current screen only sorts bookings into groups.
4. **Mixed status words.** `payment_status` holds PAID, PARTIAL, PAID_VIA_PARENT, REFUNDED, PENDING_PAYMENT and blank (9 paid website rows have a blank payment_status). `status` is a separate list (paid/cancelled/refunded). Some rows are cancelled but still have PAID. Classification reads both, so edge cases land in the wrong group.
5. **Duplicates are possible.** Some emails have several bookings on the same date (for example `nidia.latours@gmail.com` on 30 Sep ×2, and kmb3477 ×2 with no date). There is no dedupe key across Stripe, email and manual entry.
6. **Too many screens.** Operations (`/admin`), Planning board (`/admin/operations`), Tour Calendar (`/admin/tour-calendar`), Availability calendar (`/admin/availability`), Payment events (`/admin/webhook-events`), Enquiries and around 50 technical SEO/QA pages all sit in the same menu or index. That is three calendars and two payment views.

## A) Data sources

- Bookings: `bookings`, the only booking table. It has 52 columns and is written by the Stripe webhook edge function, `create-signature-checkout`, `booking-ingest.server.ts` (Gmail/Bokun), `createManualBooking` and `booking-recovery.functions.ts`.
- Snapshots: `booking_snapshots` (stripe_session_id, payload), a frozen copy of the checkout. `bookings.booking_details` and `metadata` hold nested copies of the itinerary, pickup and pax.
- Payments: fields on `bookings` plus the `stripe_webhook_events` log. Nothing links them to a separate transaction record.
- Vouchers: `booking_ingestion_candidates` and `booking_ingestion_log`, plus `external_booking_ref`.
- Assignments: `tour_assignments` (assigned 18, confirmed 1, removed 6) and the mirror column `bookings.assigned_guide_id`.
- Guides: `guides` (user_id, approval_status) and `user_roles`.
- Notifications: `ops_notifications`, `email_send_log`, `operational_activity_log`.
- Readers: `listOpsBookings` / `bookingsOps.functions.ts` (Bookings, Payments), `getOperationsBoard` (Operations), `bookingsAdmin.functions.ts` (Booking Details), and the `guide_my_tours` RPC (Guide App).
- Authoritative data: Stripe-written amount, session and paid status, and `tour_assignments`. Copies: `assigned_guide_id`, `booking_details`/`metadata` pickup/itinerary, and the snapshot payload.

## B) Reconciliation root causes

- The flow runs Stripe webhook → booking row, and Gmail scan → `stripe-voucher-reconcile.server.ts` / `booking-ingest` → merge into the booking or create a candidate. Matching order: Stripe reference, then email + amount, then date/title, then being the only candidate.
- Sync can fail at several points. Gmail scans run on a schedule and can miss messages. Voucher emails that lack a Stripe reference fall back to fuzzy matching. The details form a guest fills in after payment writes to `booking_details` and never reaches the top-level columns. Manual edits don't update the snapshot.
- Root causes: (1) tour details are not moved from nested fields into the columns; (2) there is no payment record, so nothing can be "unmatched"; (3) there is no dedupe key; (4) status words are inconsistent.

## C) Booking information

The itinerary is in the snapshot payload or `booking_details`. Pickup, pax and language are in the columns, but often only in `metadata`. Guest details, source, refs, notes and amounts are in the columns. The guide is split between two places. Booking Details reads mostly the columns, so anything nested looks missing.

## D) Guide App

- Flow: an assignment is written by `ops_assign_guide` into `tour_assignments`. `guide_my_tours` joins it to the guide's own `guides.user_id` (auth) and returns safe fields, preferring the snapshot itinerary and falling back to the Signature catalogue by `source_tour_id`.
- Failure modes:
  - The guide was assigned only through the old column, so the tour never appears (the 17 above).
  - `guides.user_id` is empty or the guide signed in with a different email.
  - Pickup is missing from the columns.
  - A custom tour has no `source_tour_id`, so no itinerary is shown.
  - The Guide App only refreshes on live updates while it is open.

## F) Phased plan

**Phase 0: freeze and data audit**
- Pause new admin features.
- Export a read-only report: each booking's guide column vs its assignment; nested vs top-level pickup, date and tour; possible duplicates; status combinations.
- Accept when: the report lists every mismatch with booking IDs, and the owner has reviewed it.

**Phase 1: one source of truth**
- `tour_assignments` becomes the only guide source. `assigned_guide_id` is kept up to date from it automatically, with a one-time fix for the 17 mismatches after owner approval.
- Add one status field with a fixed list (paid / partially paid / paid through package / refunded / cancelled / awaiting payment) and a completeness field worked out from the booking.
- Move nested pickup, date, tour and pax into the columns, only where the value is real.
- Tests: SQL checks show 0 assignment mismatches; unit tests for the status mapping.

**Phase 2: reconciliation engine**
- New `payments` table, one row per Stripe charge or voucher, with `booking_id` left empty until matched.
- Matcher scores candidates by reference, then email + amount, then email + date, then name. It only suggests; nothing links silently. Several candidates means "Needs review". Undo is possible, and every action is logged.
- Tests: the five fixture cases from the brief, plus duplicate and cancelled cases.
- Accept when: every Stripe event has exactly one payment row.

**Phase 3: admin layout**
- Menu: Operations (list / calendar), Bookings, Payments (Unmatched / Matched / All), Guides, plus More (technical pages).
- Remove Planning board, Tour Calendar and Availability as separate destinations.
- Show "Payment" and "Details complete" as two separate badges.
- Tests: 393px Playwright pass with no horizontal scroll, and a check that the menu contains exactly those items.

**Phase 4: Guide App consistency**
- `guide_my_tours` reads only the normalised columns plus the assignment.
- Admin shows each guide's sign-in link status, with an alert when `user_id` is missing.
- Refresh when the app gains focus.
- Tests: an assignment made in admin appears in the Guide App within 5 seconds; a guide cannot open another guide's tour; no money fields are returned.

**Phase 5: QA, migration and monitoring**
- A daily check that alerts if mismatches or unmatched payments are older than 24 hours.
- Owner acceptance walkthrough, then publish only when the owner explicitly asks.

## Assumption

Nothing in Phase 1 changes real data until the Phase 0 report has been reviewed and approved.
