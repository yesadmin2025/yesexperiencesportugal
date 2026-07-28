## Goal

Add "remove included lunch" to the Arrábida Wine Tailor as a dedicated, fixed −€15 per-person adjustment — separate from stop removal, supplements, the −15% cap and the 70% floor — enforced identically on client, server, Stripe and receipt. No publishing, no Studio changes. All signatures cards must be uptaded with with souchr of truth, on homepage and signatures pages. 

## 1. Pricing SSOT (client + edge mirror)

`src/config/pricing.ts` and `supabase/functions/_shared/pricing.ts` (kept byte-parallel, guarded by the existing Pricing SSOT workflow):

- New constant `TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR = 15`.
- New table `TAILOR_LUNCH_REMOVAL_ELIGIBLE = new Set(["arrabida-wine-allinclusive"])` and helper `lunchRemovalDiscountEur(tourId, lunchRemoved)` returning 15 or 0.
- New final calculator, replacing direct `tailorFinalPerPax` use in Tailor:

```text
base        = resolvedPerPax (direct tier)
reduced     = tailorAdjustedPerPax(base, principalsRemoved)   // −5%/stop, cap −15%, floor 70%
final       = reduced + supplementsEur(+35 lunch add / +20 per extra winery) − lunchRemovalEur(15)
```

`tailorFinalPerPax(direct, principalsRemoved, supplementsEur, lunchRemovalEur = 0)` gains the 4th argument (default 0, so existing call sites and tests are unchanged). The removal is subtracted after the floor, is never fed into `principalsRemoved`, and never influences the cap.

Server mirror: `serverTailorSupplementsEur` stays as-is; a separate `serverLunchRemovalEur(tourId, lunchRemoved)` returns 15 only when `tourId === "arrabida-wine-allinclusive"` and `lunchRemoved === true`, else 0.

## 2. Tailor rules

`src/data/tailorRules.ts`: add `allowRemoveLunch: boolean` + `lunchIncludedNote` to `TailorRules`; `true` only for `arrabida-wine-allinclusive`. Roman Talha and Wild Beaches keep `allowAddLunch: false` with their existing `lunchExcludedReason` — documented in the file header as a canonical product exception, not a pricing change.

Winery gate (`canSelectWineries`) is untouched: `stopsRemoved` continues to count itinerary stops only, so removing lunch cannot unlock the 4th winery.

## 3. Tailor UI

`src/routes/tours.$tourId.tailor.tsx`:

- New `lunchRemoved` state (default `false` = lunch included).
- Where the Arrábida Wine day is shown, render an "Included" lunch row with the action **"Remove included lunch · −€15 per person"** (and "Restore included lunch" when removed), `data-testid="tailor-remove-lunch"`. It is rendered outside the stop-removal list so it can never read as a stop.
- Price preview and configuration summary get a distinct line: `Included lunch removed  −€15 pp`, separate from `Stops removed −X%` and from supplements.
- `estimatedPrice` flows through the new calculator, so the pinned tier override, party total, age-band lines and `ChargeSummaryLine` all follow automatically.

`src/components/checkout/ChargeSummaryLine.tsx`: accept an optional `adjustments` array so the expandable breakdown can show "Included lunch removed" as its own negative row (per-person and party amounts).

`src/routes/booking-receipt.tsx`: render the same named adjustment line.

## 4. Server-side validation

`supabase/functions/create-signature-checkout/index.ts`:

- Accept `tailorLunchRemoved?: boolean` only.
- Reject non-boolean values (400).
- Reject `tailorLunchRemoved === true` when `tourId !== "arrabida-wine-allinclusive"` or the flow is not `tailor` (400).
- Derive the €15 from the server table only; any client euro amount is ignored.
- Feed it into the new `tailorFinalPerPax(..., lunchRemovalEur)` so the Stripe unit price, age-band lines and `tourSubtotalCents` all match the displayed total. Record `tailor_lunch_removed` in Stripe metadata and append " · lunch removed" to the line-item description so the Stripe dashboard, webhook and receipt agree.

## 5. Signature card / page data

Sync the Arrábida Wine card and Signature page copy to canonical data: lunch shown as **included** in inclusions and card meta, correct duration and unique highlight (no "Mercado do Livramento" duplication), via `src/content/signature-card-moments.ts` and the source-of-truth resolver — no invented content.

## 6. Tests

New `src/__tests__/tailor-lunch-removal.test.ts`:

- default config includes lunch (discount 0);
- removing lunch subtracts exactly 15 pp; party discount = 15 × pax;
- removal adds no −5% and does not change `principalsRemoved`;
- removal does not unlock the 4th winery (`canSelectWineries` unchanged);
- cap and floor computed ignoring lunch removal (incl. a case where the floor binds);
- re-adding restores the exact original per-pax;
- lunch removal returns 0 for every other Signature id.

Extend `src/__tests__/age-band-pct-ssot.test.ts` to assert the new constant and eligibility set are identical in the frontend and edge copies.

Extend `e2e/checkout-price-parity.spec.ts` with an Arrábida Wine lunch-removed run asserting displayed total = `data-total-eur` = checkout summary total.

## 7. Out of scope (confirmed)

- No `builder_stops` migration; Studio untouched. Canonical Évora winery pool stays in Signature canonical data only. If a Signature-side surface turns out to read Évora stops through a Studio-owned table, I will stop and report the exact dependency instead of migrating.
- `CANONICAL_VIATOR_URLS` mismatch reported, not modified.
- No publish.

## Deliverables returned after implementation

Files changed, the exact implemented formula, the server validation code, `vitest`/Playwright output, and mobile screenshots of the Arrábida Wine Tailor with lunch included and lunch removed. All signatures and tailor  updated on every card and page and sync with stripe and map rendering on every signature page . Info updates as client updates or changes info 