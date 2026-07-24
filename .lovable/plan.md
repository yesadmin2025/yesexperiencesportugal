## Goal

Verify — and lock down with a test — that two policies hold everywhere prices are shown or charged:

1. **Direct = platform − 15%** on every tier and every age band.
2. **Tailor = −5% per principal stop removed**, capped at −15%, floored at 70% of direct.

Batches A and B already implemented the maths. This pass is a verification + guardrail pass, not a rewrite. No visual changes.

## Current state (already verified via reads)

- `src/config/pricing.ts` and `supabase/functions/_shared/pricing.ts`: `DIRECT_DISCOUNT_PCT = 0.15`, `TAILOR_PRINCIPAL_STEP_PCT = 0.05`, `MAX_TAILOR_REDUCTION_PCT = 0.15`.
- `tour_price_tiers` in the DB: every row's `tiers[n]` = `round(platform_tiers[n] * 0.85)` across all 12 signatures (spot-checked all 12).
- `signatureTours.priceFrom` literals (12 tours) match the 8-pax discounted tier.
- Age bands are applied as % of the resolved discounted per-pax (`AGE_BAND_PCT` in both client + edge SSOT), so the 15% discount propagates automatically to Youth/Child/Infant.
- Tailor route (`tours.$tourId.tailor.tsx`) and server (`create-signature-checkout`) both use `tailorAdjustedPerPax(direct, principalsRemoved)`.

## What to actually change

### 1. Add a DB-vs-SSOT parity assertion

New Vitest that fetches `platform_tiers` + `tiers` for all rows (via a lightweight fixture snapshot in code, updated at each price change) and asserts `tiers[n] === round(platform_tiers[n] * (1 - DIRECT_DISCOUNT_PCT))` for every (tour, tier). Catches any future row where an editor forgot to re-apply the 15%.

### 2. Add a `priceFrom` ↔ tier[8] parity assertion

Vitest over `signatureTours` confirming `priceFrom === tiers[8]` (or the smallest available tier when 8 is missing) using the same fixture. Prevents the "From €X" drift the audit originally caught on wild-beaches / sintra.

### 3. Extend the existing tailor test

Add cases to `src/__tests__/tailor-adjusted-per-pax.test.ts` that walk 1 → 5 principals removed and assert exact −5%, −10%, −15%, −15%, −15% against a discounted-tier input (not just an abstract €200), so the test doubles as documentation of the guest-facing behaviour.

### 4. Add a Playwright smoke on the Tailor summary

One spec that opens a Signature tour, removes one principal, and asserts the summary shows a "−€… pp" chip whose value equals `round(direct × 0.05)`. Guards the UI wiring, not just the maths.

### 5. Age-band propagation regression

Extend `src/__tests__/age-band-pct-ssot.test.ts` (or add a sibling) with one integration case per band: pick a tour, resolve the journey with 1 adult + 1 youth + 1 child + 1 infant, and assert each line's `unitEur` equals `round(discountedPerPax × AGE_BAND_PCT[band])`. This is the "15% flows to every age" lock.

## Out of scope

- Any change to the discount %, cap, or floor constants.
- Any change to `tour_price_tiers` values or `priceFrom` literals — the pass is to prove they're already right, not to move them.
- Visual / copy changes on Tailor or Signature pages.

## Deliverable

Four new/expanded test files and a green CI run. If any assertion fails, that's a real drift to fix — I'll list the offending rows and propose the correction before touching data.