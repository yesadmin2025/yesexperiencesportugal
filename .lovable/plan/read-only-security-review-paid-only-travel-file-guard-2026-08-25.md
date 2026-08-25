# Read-only security review: paid-only Travel File guard

HEAD reviewed: `377a3b04cb5be0b806f6ae2f978c767676c975f9`. Working tree clean except an auto-generated `src/generated/brand-audit.json` (platform artifact, not part of this slice). No files were edited.

## Verification results

| Invariant | Result |
| --- | --- |
| 1. Public itinerary JSON/PDF never read `booking_snapshots` drafts | PASS — both routes import only `public-booking-access.server`; the only `booking_snapshots` references left live in webhook/admin/migration code, plus the test that asserts absence. |
| 2. Access requires `status='paid'` + `booking_details.snapshot.frozenAt` | PASS — `resolvePublicBookingAccess` (lines 36–51) denies non-object rows, denies `status !== 'paid'`, and requires a non-empty string `frozenAt`. Loader selects only `status, booking_details` by `stripe_session_id`. |
| 3. Unknown/unpaid reveal no PII or purchase metadata | PASS — itinerary routes return `{ok:false,error:'not_found'}` 404. `stripe-session-status` unpaid branch (lines 29–43) returns only `status`, `paymentStatus`, `environment` plus nulls/empties; `listLineItems`, `customer_details`, `customer_email`, `metadata` are all read strictly after the paid guard. |
| 4. Paid-but-not-frozen returns non-disclosing not-ready | PASS — `{kind:'not_ready'}` → 409 `{ok:false,error:'not_ready'}`, no snapshot fields. `/itinerary` renders the same generic "couldn't find an itinerary for that reference yet" copy for 404 and 409, so the states are indistinguishable to a visitor. |
| 5. `booking-confirmed` / `booking-receipt` hide details before paid | PASS — confirmation gates the Travel File block behind `{session_id && paid ?`; receipt sets `data = paid && ... ? state.data : null`, so line items, buyer name/email, totals, add-on metadata and the JSON-LD `tourReservationLd` are all null-gated, with a restrained `receipt-not-confirmed` state and the itinerary download hidden. |
| 6. No Stripe pricing / checkout / webhook / payment logic altered | PASS — only the unpaid disclosure branch of `stripe-session-status` differs; `create-*-checkout`, `stripe-webhook`, `_shared/pricing.ts` and pricing data are untouched. |

## Commands run (no edits)

- `bunx tsgo --noEmit` — 0 errors.
- `bunx vitest run src/lib/__tests__/public-booking-access.test.ts src/routes/__tests__/stripe-session-status-security-contract.test.ts src/lib/__tests__/booking-snapshot-contract.test.ts` — 17/17 passed (11 + 1 + 5).

## Bugs found

None. No critical, high or medium finding. Two low/informational notes:

1. `supabase/functions/stripe-session-status/index.ts:16` — the session-id regex `^cs_(test|live)_[A-Za-z0-9]+$` is looser than the app-side `isValidBookingReference` (`^cs_[A-Za-z0-9_]{20,255}$`), and accepts underscore-free ids of any length. Not exploitable (Stripe lookup fails and returns 500/404 with no data), purely a consistency nit.
2. `src/routes/api/public/booking-itinerary*.ts` — no rate limiting on reference guessing. Session ids are high-entropy, so this is acceptable; worth noting only if the reference format ever changes.

## Suggested optional follow-up (not applied)

Align the edge-function regex with `isValidBookingReference` and add one assertion covering the 409 not-ready path end-to-end at the route level. Say the word if you want that as a change.
