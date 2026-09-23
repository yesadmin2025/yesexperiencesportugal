# Operations hub: one calendar for every booking

Today the admin bookings list and calendar only show reservations that were paid through the website. Everything that arrives through Viator, GetYourGuide or directly by email lives outside the system, so the calendar is never the full picture of a day.

This plan turns the existing bookings screen and calendar into the single place where every booking appears — whatever channel it came from — and lets a structured guide briefing be produced from any of them.

## What changes for you

1. **Reseller bookings appear automatically.** Bókun becomes the single collection point (Viator and GetYourGuide already feed into it). When a booking is created, changed or cancelled there, it appears on your calendar within seconds, tagged with the channel it came from.
2. **Direct bookings caught from your own sent email.** The system watches the messages *you* send, recognises a voucher or confirmation, and creates a booking from it — name, experience, date, party size, pickup, amount when stated. You review and correct it in the admin; after import the booking record is the truth, not the email.
3. **Every booking carries the operational facts** a day actually needs: reference, channel, product, date and start time, pickup, party, customer contact, payment state, assigned guide, operational notes, cancellation state.
4. **Guide briefings become structured** — party and pickup, stops in running order, what is included and excluded, booked extras, timed reservations, guide instructions — editable before sending, and never showing cost or margin.
5. **The calendar reads at a glance:** channel colour, paid vs unpaid, guide assigned vs unassigned, cancelled struck through. Tap a day, tap a booking, see the detail and the briefing.

## What this plan will not touch

Public pages and their search wording, Studio, checkout, Stripe payment and webhook logic, pricing, the existing booking flow and the guest emails behind it. New work is added alongside them; nothing existing is rewritten.

## What already exists and gets reused

- `bookings` table (already holds type, tour, customer, guests, date, status, metadata, frozen `booking_details` snapshot)
- `guides` table, and briefing generation in `src/lib/guide-brief.ts` (already excludes all money)
- `src/lib/bookingsAdmin.functions.ts` — list, detail, update, calendar feed
- `src/routes/admin.bookings.index.tsx`, `admin.bookings.$id.tsx`
- `src/components/admin/BookingsAvailabilityCalendar.tsx`, `GuideBriefPanel.tsx`
- `src/routes/api/public/hooks/*` — the established pattern for authenticated inbound webhooks
- `src/lib/email/send-internal.server.ts` for briefing delivery, `stripe_webhook_events` as the model for an event-log table

## What you need to supply

| Step | Needed from you |
| --- | --- |
| Reseller sync | Bókun API access key and secret, plus permission to register a webhook. Confirm Viator and GetYourGuide are actually connected inside your Bókun account. |
| Email capture | Connecting your Gmail account (read-only), and confirming which sending address the vouchers go out from. |
| Backfill | Approval to import existing future bookings from Bókun, and how far back to read your sent mail (suggested: 90 days). |

## Phases

**Phase 1 — Data foundations.** Add the operational columns and a channel/source concept to `bookings`; add an ingestion event log and a mapping table from reseller product to your own experience. Admin screens keep working unchanged.

**Phase 2 — Bókun ingestion.** Webhook endpoint plus a scheduled reconciliation pull. Bookings appear with channel preserved.

**Phase 3 — Calendar and detail.** Channel/payment/guide/cancelled indicators, guide assignment, booking detail opens from the calendar.

**Phase 4 — Structured briefing.** Extend the existing briefing into sections, add admin editing and send.

**Phase 5 — Gmail capture.** Read-only scan of sent mail, parse, create DIRECT bookings needing review.

**Phase 6 — Backfill and audit.** Import future reseller bookings, optional historical email sweep, audit log review.

---

## Technical detail

### Schema (additive migration; every new public table gets GRANTs + RLS)

`bookings` — new nullable columns so existing rows and the Stripe flow are unaffected:
`source` (`WEBSITE` default, `BOKUN`, `EMAIL`), `source_channel` (`VIATOR`, `GETYOURGUIDE`, `BOKUN`, `DIRECT`, `WEBSITE`), `external_ref`, `external_booking_id`, `product_external_id`, `start_time`, `pickup_address`, `payment_state` (`PAID`, `PAY_ON_ARRIVAL`, `INVOICED`, `UNPAID`, `UNKNOWN`), `assigned_guide_id` → `guides.id`, `operational_notes`, `cancelled_at`, `cancellation_reason`, `synced_at`, `sync_status`, `needs_review` (boolean), `raw_source_ref`.
Unique partial index on `(source, external_booking_id)` where `external_booking_id is not null` — the idempotency key for both ingestion paths. `status` keeps the existing enum; `cancelled` already exists.

New tables:
- `integration_events` — `id, source, event_type, external_id, dedupe_key unique, payload jsonb, signature_verified, processed_at, status, error, received_at`. Raw payloads live here, not on `bookings`.
- `product_mappings` — `source, external_product_id, source_tour_id, title_hint, active`. Unmapped products create a booking flagged `needs_review` rather than guessing a tour.
- `guide_briefs` — `booking_id, sections jsonb, edited_by, edited_at, sent_at, sent_to, channel`. Generated content is editable and versioned; the current `metadata.guide_dispatches` audit trail stays.
- `admin_audit_log` — `actor_user_id, action, entity, entity_id, detail jsonb, created_at` for ingestion and briefing sends.

### Bókun ingestion

- `src/routes/api/public/hooks/bokun-booking.ts` — POST handler following the existing hook pattern: verify Bókun's HMAC signature against `BOKUN_WEBHOOK_SECRET` with `timingSafeEqual` **before** reading the payload, insert into `integration_events` (unique `dedupe_key` makes replays no-ops), then upsert the booking.
- `src/lib/integrations/bokun.server.ts` — signed REST client (`BOKUN_ACCESS_KEY`, `BOKUN_SECRET_KEY`), used for the reconciliation pull and to re-fetch a booking the webhook only summarised.
- `src/lib/integrations/bokun-mapper.server.ts` — pure payload → booking-column mapper; channel derived from Bókun's seller/agent field, not guessed. Unit-tested against recorded fixtures.
- `src/routes/api/public/hooks/bokun-reconcile.ts` — bearer-secret endpoint for scheduled catch-up (`pg_cron`), pulling the next 120 days and upserting by external id, so a missed webhook self-heals.
- Cancellations set `status = 'cancelled'`, `cancelled_at`, keep the row visible on the calendar struck through.
- All secrets read inside `.handler()`; nothing reaches client code.

### Gmail capture

Connect Gmail through the Lovable connector (gateway-backed, read-only `gmail.readonly`); the token stays server-side and is never exposed to the browser.

- `src/routes/api/public/hooks/gmail-sent-scan.ts` — bearer-secret scheduled endpoint. Queries `in:sent` with a narrow filter (`newer_than`, subject/voucher terms, confirmed sender), batch-fetches metadata, stores `historyId` in a small `integration_state` row for incremental runs.
- `src/lib/integrations/email-booking-parser.server.ts` — deterministic extraction first (labelled lines, dates, pax, amounts, PDF voucher text). Confidence scored; anything below threshold is imported as `needs_review` rather than assumed. Optional AI pass for tone-free field extraction only, never to invent a fact.
- Idempotency: `dedupe_key = gmail:<messageId>`, plus a soft duplicate check on (customer email, date, product) so a re-sent voucher updates rather than duplicates.
- Email is trigger and fallback only: after import the booking row is canonical; later edits in admin are never overwritten by a re-scan.

### Admin surfaces

- `bookingsAdmin.functions.ts`: extend the existing select lists with the new columns; add `assignGuide`, `setPaymentState`, `listIngestionEvents`. Existing signatures stay backwards-compatible.
- `BookingsAvailabilityCalendar.tsx`: channel dot/colour, unpaid ring, unassigned-guide marker, cancelled strike-through, plus a legend; day cell click opens the booking detail drawer.
- `admin.bookings.index.tsx`: filters for channel, payment state, guide, needs-review.
- `admin.bookings.$id.tsx`: source block (channel, external reference, sync status, last sync), guide assignment, operational notes, briefing panel.
- New `/admin/integrations` page: connection health, last sync, failed events with retry.

### Guide briefing

Extend `guide-brief.ts` into sections — party & pickup, stops in order, inclusions, exclusions, booked extras, timed reservations, guide instructions, sensitive notes (only when present) — sourced from the frozen snapshot, the mapped experience's stops, or the ingested payload; missing facts still read "to confirm". Generated draft saved to `guide_briefs`, editable in `GuideBriefPanel`, then sent by the existing email/WhatsApp path. The money-exclusion rule is enforced by a test asserting no price, total, margin or payment field can appear in briefing output.

### Backfill

1. Dry-run the Bókun pull for all future dates, writing to `integration_events` only, and review a diff report in `/admin/integrations`.
2. Approve, then upsert — website bookings are matched on external reference and never duplicated.
3. Optional sent-mail sweep over the agreed window, everything landing as `needs_review`.
4. Website bookings backfilled to `source = 'WEBSITE'`, `source_channel = 'WEBSITE'` by migration default.

### Safety

Additive migration only; no column drops or renames; no changes to Stripe webhooks, checkout, Studio, pricing or public routes. New endpoints are secret-verified, admin functions keep `requireSupabaseAuth` + `assertAdmin`. Mapper/parser unit tests plus regression tests asserting the existing booking flow and briefing money-exclusion still hold.
