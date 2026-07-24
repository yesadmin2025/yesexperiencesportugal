# Batch B — Tailor pricing → SSOT

Replace the legacy flat ±€20 / ±€10 tailor deltas with the SSOT `tailorAdjustedPerPax(direct, principalsRemoved)` from `src/config/pricing.ts` (mirrored in `supabase/functions/_shared/pricing.ts`, shipped in Batch A). Refresh the Tailor UI so the price change is honest and legible, and make the checkout server recompute the tailor total instead of trusting the client anchor.

## Policy recap (already agreed in Phase 1)

- Base per-pax = real tier from `resolvePerPaxEur(tour, headcount, tierOverrides)` (fallback: `tour.priceFrom`).
- **Principal removed** = a *core / principal* stop the guest chose to skip. Add-ons and extra optional stops do **not** move the base price (they're separate lines / manual review).
- Each principal removed = −5% (`TAILOR_PRINCIPAL_STEP_PCT`), capped at −15% (`MAX_TAILOR_REDUCTION_PCT`), floored at 70% of direct (`operationalFloor`).

## Files & changes

### 1. `src/routes/tours.$tourId.tailor.tsx` (P0)
- Remove `ADD_STOP_DELTA` / `REMOVE_STOP_DELTA` constants.
- Replace the `estimatedPrice` `useMemo` with:
  - `principalsRemoved` = `blueprint ? skippedCore.size : skipped.size` (added optional stops no longer reduce or inflate base).
  - `perPaxEur = tailorAdjustedPerPax(basePerPax, principalsRemoved)`.
- Keep `basePerPax` as-is (real tier / anchor).
- Add a small `savingsEur = basePerPax - perPaxEur` value used in the summary.

### 2. Tailor UI refresh (same file, presentation only)
- Live summary price row (~line 1490): show `perPaxEur` with an inline `−€{savings} pp` chip when > 0; keep "For {guests} guest(s) · per person" wording.
- Below the price, add a one-line explanation when `principalsRemoved > 0`:
  *"Adjusted from €{basePerPax} — {n} stop{s} removed. Direct booking rate, floor-protected."*
- Skipped-core / skipped stop chips get a `−€{step}` micro-hint next to the label, computed against current `basePerPax` so the number always matches what the guest sees.
- Optional additions & manual-supplier notices unchanged (price impact still handled by manual confirmation copy).
- Reserve CTA + drawer summary use `perPaxEur` (no visual layout change).

### 3. `src/lib/tailored-policy.ts` wiring (P0, small)
- Import `evaluateTailorAdjustment` in the tailor route.
- Wrap the three interactive actions (`toggle` core skip, `toggle` optional add, pace change) with an evaluation against a `ResolvedSignature` built from `tour.stops` / `blueprint`. On refusal, toast the `message` and, when `route === "studio"`, keep the toast (no auto-redirect — Batch B is presentation-safe).

### 4. `supabase/functions/create-signature-checkout/index.ts` (P0)
- For `flow === "tailor"` only:
  - Accept `principalsRemoved: number` in the request body (validated 0..8, defaulted to 0).
  - After resolving `eurPerPax` from the tier / anchor, run it through `tailorAdjustedPerPax(eurPerPax, principalsRemoved)` **before** building the age-band price lines.
  - Ignore any `priceFromEur` value the client submits for tailor flow beyond its role as anchor fallback when no tier row exists.
- Signature / studio flows untouched.

### 5. Client → server contract (same file section + tailor route)
- Tailor route sends `principalsRemoved` in the `supabase.functions.invoke("create-signature-checkout", …)` payload.
- Payload also drops `estimatedPrice`-as-priceFromEur override in favour of the raw `basePerPax` anchor + `principalsRemoved`, so server is the source of truth.

### 6. Tests
- `src/__tests__/tailor-adjusted-per-pax.test.ts` (new, unit): matrix over 0..5 principals removed × two anchor prices, asserting the client SSOT matches the values in `docs/audit-2026-07/tailor-formula.md`.
- `e2e/checkout-price-parity.spec.ts` (extend): add a tailor scenario that skips 2 core stops and asserts the drawer per-pax = server total / guests.

## Out of scope (Batch C / D)

- Studio V3 composer refactor.
- Card "From €" refresh across index / experiences (still driven by `tour.priceFrom`).
- Removing / renaming add-on lines beyond the pricing behaviour above.

## Risk & rollback

- Pricing policy already validated in Phase 1 (`ssot-proposal.md`, `tailor-formula.md`).
- All maths lives in one function; if a regression surfaces, reverting the tailor route's `estimatedPrice` block and the server tailor branch restores current behaviour without touching Batch A.
