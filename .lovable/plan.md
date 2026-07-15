# Studio Guest Composition — Always-Visible Transparency

## Fix

Introduce a single formatter and use it at every Studio V3 surface that displays a guests count so the split between adults and children stays visible from selection to checkout.

### New helper — `src/components/studio-v3/formatGuests.ts`

```ts
export function formatGuestComposition(
  adults: number | null | undefined,
  minorAges: readonly number[] | null | undefined,
  fallbackGuests?: number | null,
): string | null {
  const adultCount = typeof adults === "number" && adults >= 0 ? adults : null;
  const minorCount = minorAges?.length ?? 0;
  const total =
    adultCount != null
      ? adultCount + minorCount
      : typeof fallbackGuests === "number" && fallbackGuests > 0
        ? fallbackGuests
        : null;
  if (total == null || total <= 0) return null;
  const guestWord = total === 1 ? "guest" : "guests";
  if (adultCount == null) return `${total} ${guestWord}`;
  const adultWord = adultCount === 1 ? "adult" : "adults";
  const childWord = minorCount === 1 ? "child" : "children";
  return `${total} ${guestWord} (${adultCount} ${adultWord}, ${minorCount} ${childWord})`;
}
```

Rule: when `adults` is unknown (early phases), fall back to `${total} guests` — never guess a split.

### Render sites to update (all in `src/components/studio-v3/`)

1. **`FinalRevealStory.tsx`** — story chip line (lines ~136–140 and ~232). Replace `guestsLabel` with `formatGuestComposition(state.adults, state.minorAges, state.guests)`.

2. **`SignaturePriceCard.tsx`** — the "For N guests" label above the per-guest number (currently `` `For ${partyCount} guest(s)` ``). Accept optional `adults` + `minorAges` props (default undefined); render `formatGuestComposition(adults, minorAges, partyCount)` when it returns non-null, else keep today's copy. Wire the props from `StudioV3.tsx` where the card is mounted (already passes `guests`).

3. **`CheckoutSummary.tsx`** — Guests row `value` (lines ~226–228). Prefer `formatGuestComposition(adults, minorAges, guestDetails.guests)` over the current bare `N guest(s)`. The traveller-itemisation block below stays untouched (it's the priced breakdown, not the composition line).

4. **`RunningInvestmentRibbon.tsx`** — line `party of ${guests}`. Swap for `formatGuestComposition(state.adults, state.minorAges, state.guests)` when it returns non-null; keep the `from €X / guest · … · ~€YK` shape.

5. **Refine surface** — the "refine" experience in Studio V3 is `RefineAccordion.tsx` / `RefineStopCard.tsx`, which currently render no guest string. Add a compact composition line at the top of `RefineAccordion` (single `<p data-testid="studio-v3-refine-guests">`) using the same formatter, so the traveller sees the split while refining stops. Only render when the formatter returns non-null.

No other surface (map legend, add-on chips, etc.) displays a guests count.

### Update dynamically

Every consumer already receives `state.adults` and `state.minorAges` from `StudioV3.tsx`. The formatter is pure — a new render every time the props change is enough. No new state, no effects.

## Tests

### Unit — `src/components/studio-v3/__tests__/format-guests.test.ts` (new)

- `(2, [10, 8])` → `"4 guests (2 adults, 2 children)"`
- `(1, [5])` → `"2 guests (1 adult, 1 child)"`
- `(2, [])` → `"2 guests (2 adults, 0 children)"`
- `(null, null, 3)` → `"3 guests"`
- `(null, null, 0)` → `null`

### Component

- `CheckoutSummary`: mount with `adults=2, minorAges=[10, 8]` → Guests row text contains `"4 guests (2 adults, 2 children)"`.
- `FinalRevealStory`: mount with the same → meta chip contains the composition string.
- `SignaturePriceCard`: mount with `adults=2, minorAges=[10]` and `guests=3` → header line reads `"3 guests (2 adults, 1 child)"` in place of `"For 3 guests"`.

### E2E — `e2e/studio-v3-guest-composition.spec.ts` (new)

- Deep-link to the reveal via the existing `walkToReveal` helper.
- Set 2 adults + add 1 minor via the Composition control.
- Assert composition text is visible on:
  - `[data-testid="studio-v3-reveal"]` story chip
  - `[data-testid="studio-v3-price-card"]` header
  - `[data-testid="studio-v3-refine-guests"]` (new)
- Open the checkout drawer → assert Guests row includes the composition.
- Remove the minor → all four sites drop back to `"2 guests (2 adults, 0 children)"` in the same interaction.

## Out of scope

- No changes to age-band pricing, checkout server function, or backend.
- No new state model — reuses `state.adults` + `state.minorAges` already in Studio V3.
- Composition selection UX itself (`Composition.tsx`) unchanged.

## Rollout

1. Land helper + 5 render-site edits + tests in one commit.
2. Green: new unit + component tests, new e2e spec, existing `journey-revision` + `add-ons-same-frame` + `final-investment-live` specs.
3. Mobile QA on `/studio-v3?e2e=1`: pick 2 adults + 1 child → composition visible on story, price card, refine, ribbon, and checkout.
