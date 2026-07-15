# Studio Pricing Consistency — Total as Source of Truth

## Problem (verified in `src/components/studio-v3/SignaturePriceCard.tsx`)

Today the reveal card renders two prices computed on different tracks:

- **Per-guest** (`studio-v3-base-price`) — `displayPerPaxEur`, resolved from Viator per-guest tier data (`useTourPriceTiers`) or the catalogue `priceFrom`. It does NOT include add-ons.
- **Party total** (`studio-v3-party-total`) — `displayPerPaxEur × partyCount + Σ add-on line items (unit-aware)`.

When the traveller toggles an add-on:
- The total updates (add-ons added).
- The per-guest number stays static.

Result: `perPerson × guests ≠ total` on screen. Same drift occurs when guests change and add-on line items use `per_group`/`per_vehicle`/`fixed` units (they don't scale linearly with headcount).

## Fix — single source of truth

Total is the only computed price. Per-guest is a pure derivation of it.

```ts
const totalGuests = (adults ?? 0) + (minorAges?.length ?? 0);
// fall back to state.guests when the adults/minors split isn't set yet
const effectiveGuests = totalGuests > 0 ? totalGuests : (guests ?? 1);

const total = partyTotalEur;                     // already unit-aware
const perPerson = effectiveGuests > 0
  ? Math.round(total / effectiveGuests)
  : 0;
```

Both numbers rerender from the same `total` on every add-on toggle and every guest change.

## Scope of changes (frontend/presentation only)

### 1. `src/components/studio-v3/SignaturePriceCard.tsx`

- Keep `partyTotalEur` as the authoritative computation (base × guests + Σ unit-aware add-on line items). No changes to how it's derived.
- Replace the rendered per-guest number at line 559 (`€{displayPerPaxEur ?? priceEur}`) with `€{perPersonDerived}`, where `perPersonDerived = Math.round(partyTotalEur / effectiveGuests)`.
- Update the `data-per-pax-eur` attribute (line 554) to `perPersonDerived` so tests read the same value the user sees.
- Retain `priceEur` internally as the **base anchor** used to compute add-on line items (`addOnEurFor({ baseEur: priceEur, … })`) and for the `data-base-price-eur` catalogue anchor attribute (required by `price-source-of-truth.test.tsx`). It is no longer rendered as text.
- Remove the tier-picker UI display of per-guest tiers (`tierRows`, `cheapestRealTier`, "drops to €X/pp with N guests" hint) — they show static per-guest numbers that will disagree with the derived per-person once add-ons are on. The tier data itself stays available to `useTourPriceTiers` for computing the base `priceEur` anchor per party size, but no per-tier UI row is shown.
- Ensure both `studio-v3-base-price` (now derived per-person) and `studio-v3-party-total` are rendered from the same `partyTotalEur` value in the same render pass — they already are; this fix just aligns them mathematically.
- Add a dev-only invariant check:
  ```ts
  if (import.meta.env.DEV && partyTotalEur != null && effectiveGuests > 0) {
    if (Math.abs(perPersonDerived * effectiveGuests - partyTotalEur) > effectiveGuests) {
      console.error("[studio-v3] price mismatch", { partyTotalEur, perPersonDerived, effectiveGuests });
    }
  }
  ```
  Tolerance = `effectiveGuests` € to absorb the single rounding step; anything larger is a real drift.

### 2. `src/components/studio-v3/RunningInvestmentRibbon.tsx`

The ribbon line currently prints `from €${priceFromEur} / guest · party of ${guests} · ~€${totalK}`, using the static catalogue `priceFrom` for per-guest. Change to derive both from the same source:
- Compute `partyTotal = priceFromEur × guests + Σ selected add-on line items` (add-on selection lives on `state.selectedAddOnIds` if present — reuse the same helper as the price card, or accept `partyTotalEur` as a prop from the parent that already knows it).
- Render `perGuest = Math.round(partyTotal / totalGuests)` and `total = partyTotal`.
- If ribbon has no access to add-on selection at its mount point, pass `partyTotalEur` down from `StudioV3.tsx` (already computed there for the price card).

### 3. `src/components/builder/StickyBar.tsx`

Currently `const total = pricePerPersonEur * guests`. This module is legacy Builder (not Studio V3) — **out of scope** unless it's also mounted inside Studio V3. Grep confirms it's Builder-only. Leave untouched.

### 4. Any other Studio V3 surface displaying per-guest

Grep for `data-testid="studio-v3-base-price"`, `€{priceEur}`, `/ guest` under `src/components/studio-v3/`. Every render site must use the derived `perPersonDerived`, never the raw `priceEur`/`displayPerPaxEur`.

## Test updates

### Update
- `src/components/studio-v3/__tests__/price-source-of-truth.test.tsx`
  - The "party total = per-pax × guests" test still holds because `perPersonDerived = round(total / guests)` ⇒ `perPersonDerived × guests ≈ total` (within €guests). Loosen the exact-equality assertion to `Math.abs(perPax * 3 - partyTotal) <= 3`.
  - The "add-ons update per-pp total by catalogue %" test currently reads `studio-v3-add-ons-total` (per-pax add-ons subtotal). Keep — that subtotal is still unit-`per_person`-based per catalogue and unchanged.
  - `data-base-price-eur` anchor attribute still equals `tour.priceFrom` — kept.

### Add
- `src/components/studio-v3/__tests__/pricing-consistency.test.tsx` (new):
  1. Mount `SignaturePriceCard` with `guests=3`, no add-ons → assert `perPersonDerived × 3 === partyTotalEur` (±3).
  2. Toggle one `per_person` add-on → both values update in the same render, invariant still holds.
  3. Toggle one `per_group` add-on → per-guest number changes (total spread across guests), invariant holds.
  4. Change guests 3 → 5 → per-guest updates, invariant holds.
  5. In dev mode, force an artificial mismatch (via a stubbed prop path) and assert `console.error` is called with `[studio-v3] price mismatch`.

### E2E
- `e2e/studio-v3-final-investment-live.spec.ts` reads `studio-v3-party-total` — unchanged behaviour.
- Add an assertion in the same spec: on every add-on toggle, `Number(baseEl.getAttribute("data-per-pax-eur")) * partyCount` is within `partyCount` € of the party-total number.

## Out of scope

- No changes to add-on catalogue, `signatureTours.priceFrom`, tier pricing hook, Viator/USD conversion, or checkout server functions.
- No backend / RLS / migrations.
- Builder (non-Studio-V3) sticky bar untouched.

## Rollout

1. Land the derivation + dev invariant + ribbon fix + test suite in one commit.
2. CI runs `price-source-of-truth`, new `pricing-consistency`, and `studio-v3-final-investment-live` — all must pass.
3. Manual mobile QA on `/studio-v3?e2e=1`: walk to reveal, toggle each add-on, change guest count 2↔5, confirm per-guest and total always agree on screen.
