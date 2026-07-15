## Problems observed

In `BrandedCheckoutDrawer` (`ExperienceSummaryCard`):

1. **Total ignores age-band pricing.** `total = pricePerPaxEur * guests + addOnsTotal` multiplies the adult tier by headcount, so a child at 50% (or infant at 0%) is charged as an adult. The Signature card + `resolveJourneyPricing` already produce the correct per-line total; the drawer just doesn't consume it.
2. **Add-ons don't itemise per pax type.** Each add-on line is rendered as `€X × guests` for the whole party. Nothing distinguishes adults from minors, and the "€ × guests" hint disappears entirely once any minor is present (age-based pricing branch shows only "age-based pricing", no breakdown).
3. **Add-ons total not always updating pp / party line.** The drawer reads `summary.addOnsTotalEur` but `SignaturePriceCard` emits `partyTotalEur` (unit-aware) via `onAddOnsChange`. When the parent forwards the legacy `totalEur` (per-person sum) into `addOnsTotalEur`, the drawer under-counts; when it forwards `partyTotalEur` while also multiplying `pricePerPaxEur * guests`, the pp line drifts.

## Fix (adapter + drawer only, no pricing-engine change)

### 1. Extend `CheckoutSummary` with canonical journey lines
- Add optional `journeyLines?: readonly JourneyPriceLine[]` and `journeyTotalEur?: number` (from `resolveJourneyPricing`) to the `CheckoutSummary` type used by `BrandedCheckoutDrawer`.
- Populate them wherever the drawer is opened (StudioV3 checkout path — same place that already calls `resolveJourneyPricing` via `useResolvedJourney`).

### 2. Rewrite drawer total math
- Prefer `journeyTotalEur + addOnsPartyTotalEur` when `journeyLines` exist.
- Fall back to the current `pricePerPaxEur * guests + addOnsTotal` only when there are no minors AND no journey lines (legacy callers).
- Consume `addOnsPartyTotalEur` (unit-aware) instead of `addOnsTotalEur` when available; keep `addOnsTotalEur` as fallback.

### 3. Itemise pricing in `ExperienceSummaryCard`
Replace the single "Total" row's inline hint with a compact breakdown block above the Total, rendered only when `journeyLines` is present:

```
Travellers
  Adult × N              €A × N        €A·N
  Child (age 8)          €C            €C
  Infant (age 1)         €0            €0
Add-ons
  • Wine flight (× guests)             €…
Total                                  €T
```

- Adults grouped as `Adult × N   €unit × N   €subtotal`.
- Each minor line: `Child (age X)` / `Youth (age X)` / `Infant (age X)` with its band-adjusted unit price and subtotal.
- Keep existing add-ons list; when `journeyLines` present, drop the "× guests" fiction on add-ons priced `per_person` and show `€perUnit × headcount` correctly (already available on `SelectedAddOnSummaryItem.perUnit` / `.amount` — pipe those through the summary instead of the legacy `priceEur`).

### 4. Extend add-on payload in `CheckoutSummary`
Add `perUnit`, `amount`, `unit`, `unitLabel` to `summary.addOns[]` (mirror `SelectedAddOnSummaryItem`). Update the StudioV3 adapter to pass these through unchanged. Drawer renders `amount` for the line total and `perUnit`/`unitLabel` for the hint.

### 5. Tests
- New test: drawer total for `2 adults + 1 child (8)` = 2·adult + 0.5·adult (no add-ons), matching `resolveJourneyPricing`.
- New test: drawer total live-updates when add-on toggles arrive via `summary.addOns` change.
- New test: itemised block renders one line per traveller band, with age shown for minors.

## Out of scope
- No changes to `SignaturePriceCard` internals or to the Stripe session builder (server-side line items already use `resolveJourneyPricing`).
- No changes to the composer preview / Phase E work.
- No visual redesign — same tokens, same spacing scale as current summary card.

## Files touched
- `src/components/checkout/BrandedCheckoutDrawer.tsx` (total math + itemised block)
- `src/components/studio-v3/CheckoutSummary.tsx` (extend type + adapter payload)
- `src/components/studio-v3/StudioV3.tsx` (forward `journeyLines`/`journeyTotalEur` from `useResolvedJourney` into the drawer summary, forward unit-aware add-on fields)
- `src/components/studio-v3/__tests__/checkout-drawer-itemisation.test.tsx` (new)
