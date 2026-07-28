## Goal

When a payment succeeds, freeze exactly what was purchased, email the team a complete summary with a deep link, and give admins a booking page that shows the full purchase. No pricing, Stripe amount, checkout calculation or business rule changes — every euro figure is copied from what was already charged.

## What exists today (verified)

- `supabase/functions/stripe-webhook/index.ts` inserts/updates `public.bookings` and posts to `/api/public/hooks/checkout-email`.
- `bookings` already has `booking_details jsonb`, currently holding only `{ composition }`.
- The team email uses `src/lib/email-templates/internal-booking.tsx` (guest, email, experience, type, date, guests, amount, pickup, Stripe session) — no booking reference beyond the Stripe id and no admin link.
- Stripe metadata carries only truncated fields (`stops` capped at 480 chars, `add_ons` JSON capped at 480 chars); itinerary, removed options, notes and the pricing breakdown are not durably stored.
- There is no `/admin/bookings` route — admins have no place to look at a booking.

## Plan

### 1. Booking snapshot (database)

New table `public.booking_snapshots`:

- `stripe_session_id` (PK), `payload jsonb`, `created_at`, `frozen_at`
- Grants: `service_role` full; no `anon`; `authenticated` SELECT only via admin policy `has_role(auth.uid(),'admin')`. RLS enabled.

Flow:

```text
checkout create  ->  writes draft snapshot row (payload, frozen_at NULL)
payment succeeds ->  webhook sets frozen_at = now()
                     and copies payload into bookings.booking_details.snapshot
```

The snapshot is display-only: written from a new optional `snapshot` field on the checkout request body, never read by any pricing path.

Snapshot payload contains: experience id/title, itinerary stops (label, duration, order), selected add-ons (label + price as charged), removed options (removed stop labels, lunch removed/added, extra wineries), pickup, total duration, customer notes, and the pricing breakdown already computed server-side (per-pax, composition subtotals, supplements/credits, add-ons total, final total).

### 2. Admin notification email

`src/lib/email-templates/internal-booking.tsx` gains: booking reference, experience name, booking date, guests, total paid, and a prominent "Open in Admin" button linking to `/admin/bookings/<bookingId>`, plus a compact add-ons / removed-options / notes block. `src/routes/api/public/hooks/checkout-email.ts` and the webhook payload forward `bookingId` and the snapshot summary.

### 3. Admin booking pages

- `src/routes/admin.bookings.tsx` — searchable list (date, guest, experience, total, status).
- `src/routes/admin.bookings.$id.tsx` — full detail: experience, booked itinerary, add-ons, removed options, pickup, duration, customer notes, pricing breakdown, Stripe session/payment ids, and email send log for that booking.
- Data via `createServerFn` with `requireSupabaseAuth` + admin role check (same pattern as existing admin tools). Both routes `noindex`.

### 4. Tests

- Unit: snapshot builder shape + email template renders all required fields.
- Unit: snapshot freeze is idempotent and never mutates amounts.
- Existing suites (pricing parity, checkout parity, typecheck) re-run to prove no pricing drift.

## Technical notes

Legacy bookings without a snapshot render from `metadata` + `booking_details.composition` with a clear "legacy record" note, so the admin page never breaks on older rows.

## Deliverables at the end

Files changed, database changes, and tests performed will be listed in the final report.
