## Goal

Make the Studio pricing UI show a real, itemised add-ons breakdown — for every selected add-on, display the name, quantity (based on how it's billed), per-unit price, and party-total impact — everywhere pricing appears (Refine price card, Final Reveal inclusions panel, Checkout summary).

Today all three surfaces render a single line per add-on like `+€40 per guest · €120 for your group`. There is no per-add-on subtotal row inside the price card, no explicit quantity (`×3`), and the refine card doesn't itemise add-ons at all — it only rolls them into the "Final estimated total" number.

## What changes

### 1. `SignaturePriceCard.tsx` — add an "Additions" itemised block

Right below the `journeyRows` traveller-lines list (around line 750) and above the "Final estimated total" line, render a new list that mirrors the traveller-rows visual style so the two feel like one ledger:

For each selected add-on, one row:

```
Sunset sailing (€40 × 3)                                €120
Private driver upgrade (per group)                      €90
```

Rules per row (derived from the existing `SelectedAddOnSummaryItem`):
- `label` — the add-on name.
- Quantity segment:
  - `unit === 'per_person'` → `(€{perUnit} × {guests})` when `guests > 1`; hidden when guests = 1.
  - `unit === 'per_group' | 'per_vehicle' | 'fixed'` → `({unitLabel})` (e.g. `per group`).
- Right-aligned subtotal = `amount` (party total for that line), formatted `€{n}` with `toLocaleString("en-GB")`.

Show the block only when `selectedAddOns.length > 0` and `hasPrice`. Add `data-testid="studio-v3-add-on-lines"` and a per-row `data-testid="studio-v3-add-on-line"` with `data-addon-id`, `data-per-unit-eur`, `data-amount-eur` for regression tests.

The existing chip picker (further down the card) is untouched — the new block is a read-only summary of what's already selected, matching the traveller ledger's role.

### 2. `FinalRevealStory.tsx` — enrich the "Your additions" list inside the inclusions disclosure

Replace the current row (label + `+€perUnit unitLabel` + optional group amount) with the same three-column shape as the refine card:

```
· Sunset sailing        (€40 × 3)          €120
· Private driver        (per group)         €90
```

Keeps the existing collapsible container, just swaps the row rendering. No change to the always-visible "Final investment" summary above it — that already shows the party total and per-guest number.

### 3. `CheckoutSummary.tsx` — same row treatment

Mirror the exact same row shape in the checkout drawer's `Your additions` block (lines 204–231) so refine → final reveal → checkout read as one ledger. The drawer's `BrandedCheckoutDrawer` already itemises correctly and stays as-is.

## What stays the same

- No changes to pricing math. All numbers come from the existing `SelectedAddOnSummaryItem` fields (`perUnit`, `amount`, `unit`, `unitLabel`) produced by `useResolvedJourney` / `SignaturePriceCard`'s `buildSummary`.
- No changes to add-on selection logic, budget gating, or the chip UI.
- No changes to the "Final estimated total" line or per-guest number — those already reflect add-ons.
- No copy or brand-token changes outside the new rows.

## Regression coverage

Extend `src/components/studio-v3/__tests__/price-source-of-truth.test.tsx` (or add a sibling `add-on-itemisation.test.tsx`) with:

1. Select 2 add-ons of different units (per_person, per_group) with `guests = 3`. Assert both `studio-v3-add-on-line` rows render in the refine card with the expected `data-per-unit-eur` and `data-amount-eur`, and that the row subtotals sum to `addOnsPartyTotalEur`.
2. Assert identical rows appear in `FinalRevealStory` and `CheckoutSummary` (parity check).
3. Assert `guests = 1` hides the `(€X × N)` quantity fragment for per_person items.

All existing add-on/parity tests must continue to pass.

## Files touched

- `src/components/studio-v3/SignaturePriceCard.tsx` — new itemised list JSX block, no logic changes.
- `src/components/studio-v3/FinalRevealStory.tsx` — swap row rendering inside existing "Your additions" list.
- `src/components/studio-v3/CheckoutSummary.tsx` — swap row rendering inside existing "Your additions" list.
- `src/components/studio-v3/__tests__/price-source-of-truth.test.tsx` (or new file) — coverage for the new rows and cross-surface parity.
