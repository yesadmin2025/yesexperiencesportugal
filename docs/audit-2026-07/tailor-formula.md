# Tailor Formula — Proposed vs Current

## Current implementation (`src/routes/tours.$tourId.tailor.tsx:441-464`)
```
basePerPax  = resolvePerPaxEur(tour, guests)   // real tier or "from"
p = basePerPax
p += optionalSelected.size * 20                // add-on stop = +€20 flat
p -= skippedCore.size      * 10                // removed core stop = −€10 flat
floor = round(basePerPax * 0.85)
estimatedPrice = max(floor, round(p))          // per-pax
```
Then age bands are applied inside `resolveJourneyPricing`.

**Issues (see `report.md` T-1…T-6):**
- Flat ±€10/€20 deltas ignore tier scale (a €300 tour and a €120 tour react the same).
- Floor is hard-coded to 85% of the base price — inconsistent with the site-wide direct-booking price system.
- Nothing distinguishes "principal" from "descriptive/free" stops — any core removal earns credit.
- Add-ons priced flat instead of using the `signatureAddOns.ts` unit-aware amounts already present.

## Proposed formula (matches your spec)

```
platformPrice          = tour_price_tiers[tour][tier]           // NEW SSOT
directBookingPrice     = round(platformPrice * 0.85)            // 15% off
minimumOperationalPrice= round(directBookingPrice * 0.70)

baseTailorPrice        = directBookingPrice                     // per-pax
removalCount           = # of principal, removable, chosen-removed stops
tailorReductionPct     = 0.05 * removalCount                    // 5% each
tailorReductionEur     = round(baseTailorPrice * tailorReductionPct)

perPaxBeforeAddOns     = max(minimumOperationalPrice,
                             baseTailorPrice - tailorReductionEur)

# Age bands unchanged: adult 100 · youth 75 · child 50 · infant 0
subtotalPerBand        = Σ(perPaxBeforeAddOns * AGE_BAND_PCT[band])

addOnsTotal            = Σ signatureAddOns amount (respect per_group vs per_person)

finalTotal             = subtotalPerBand + addOnsTotal
```

## "Principal / removable" classification

A stop counts toward the 5% reduction **only** when ALL of these are true:
1. It appears in `tour.stops[]` as a top-level stop (not a descriptive sub-note).
2. It has no `lock` in the blueprint (`src/data/tailorBlueprints.ts` — `lock` gates transport/guide/lunch/museum-required stops).
3. It is not tagged `pricing: "descriptive"` or `pricing: "included-free"` (**NEW** field to add in Phase 2).
4. Removing it doesn't drop the itinerary below the operator's declared minimum stop count for that Signature.

Everything else (viewpoints, optional photo stops, "free time" markers, descriptive notes) shows the checkmark toggle but does NOT change the price. UI shows an inline "Included at no extra charge" pill so guests understand.

## Worked examples

Using **azeitao-cheese** at tier 4 (=€189 platform):
- direct = round(189 × 0.85) = **€161**
- min    = round(161 × 0.70) = **€113**

| Scenario | Removals | Reduction | Per-pax | Line total (4 adults) |
|---|---:|---:|---:|---:|
| Baseline | 0 | 0% | 161 | 644 |
| Remove 1 principal | 1 | −5% (−€8) | 153 | 612 |
| Remove 2 | 2 | −10% (−€16) | 145 | 580 |
| Remove 3 (max) | 3 | −15% (−€24) | 137 | 548 |
| Remove 3 + € 40 add-on (per-group) | 3 | −15% | 137 | 548 + 40 = **588** |
| Attempt remove 4 | 4 | −20% but floor at €113 | 129→**137** (rounded down capped by min after all 3 applied) | — |

Floor sanity: on the smallest tier (azeitao 8+ = €119 platform → €101 direct → €71 min) the full three-removal path yields €101 × 0.85 = **€86** which is still above the €71 floor. No tour crosses its floor with 3 removals in the current dataset.

## Regional coherence guardrail
The Tailor UI must not surface swap or add options that live outside `tour.region` (Arrábida ≠ Sintra ≠ Alentejo ≠ Centro). Enforced in `evaluateTailorAdjustment` (`src/lib/tailored-policy.ts`) — currently only used by future Tailor V2; Phase 2 must call it from the current tailor route.

## Display copy
```
EN  "Direct booking price"     "Experience adjustment: −€X"
PT  "Preço de reserva direta"  "Ajuste da experiência: −€X"
```
No aggressive discount language, no strikethrough platform price unless verifiable and current.
