# Studio V3 — Single Resolved Journey (one source of truth)

Today the same numbers are recomputed independently in three places, with subtly different rules:

- `SignaturePriceCard` — computes its own `perPersonDerived` / `partyTotalEur` from `resolvePerPaxEur` + add-on unit math.
- `FinalRevealStory` mount in `StudioV3.tsx` — recomputes `perPaxEur` / `totalEur` using flat `perPax × guests + selectedAddOnsTotalEur × guests` (ignores age-band pricing).
- `CheckoutSummary` mount in `StudioV3.tsx` — recomputes `perPaxEur` / `totalEur`, this time honoring age-band via `resolveJourneyPricing` when `adults + minorAges` are set.

Reveal and checkout can therefore diverge for families with minors. Stops are also resolved twice (reveal + checkout) via inline `resolveStudioV3Route` blocks.

## The fix — one resolver, one shape

Create `src/components/studio-v3/useResolvedJourney.ts` (pure hook, no side effects):

```ts
export interface ResolvedJourney {
  readonly adults: number | null;
  readonly minorAges: readonly number[];
  readonly guests: number;             // effective party size used for pricing
  readonly stops: ReadonlyArray<{ label: string; story: string }>;
  readonly addOns: SelectedAddOnSummary["items"];
  readonly perPaxEur: number | null;
  readonly totalEur: number | null;
}

export function useResolvedJourney(
  state: StudioV3State,
  selectedAddOns: SelectedAddOnSummary["items"],
  selectedAddOnsTotalEur: number,   // already-computed party-normalized add-on total (per-person basis)
  tourPriceTiers: TierOverrides | null,
): ResolvedJourney
```

Rules baked into the hook (canonical, used by every surface):

1. `adults`, `minorAges`, `guests` — taken straight from `state`; `guests` falls back to `adults + minorAges.length` when unset, then to `2`.
2. `stops` — priority chain: `state.editedRoutePoints` → `resolveStudioV3Route(...).routePoints` → `tour.stops`. Same chain used everywhere (reveal + checkout + any future surface).
3. `perPaxEur` — `resolvePerPaxEur(tour, guests, tourPriceTiers)?.eurPerPax ?? tour.priceFrom ?? null`.
4. `totalEur` — age-band branch first: when `adults ≥ 1 && minorAges.length > 0`, use `resolveJourneyPricing(tour, adults, minorAges, tourPriceTiers).totalEur + selectedAddOnsTotalEur × guests`. Otherwise `perPax × guests + selectedAddOnsTotalEur × guests`. Rounded once, here, and never again downstream.
5. `addOns` — pass-through of `selectedAddOns` (already the resolved list from `SignaturePriceCard.onSelectionChange`).

## Duplicate-source guard (dev-only warning)

Inside the hook, when `import.meta.env.DEV`:
- If the caller passes a `state` where `state.guests` and `(adults + minorAges.length)` disagree by more than 0, `console.warn("[resolvedJourney] guest source mismatch", …)`.
- If `resolveJourneyPricing` returns a total that would differ from the flat calc by more than `guests` €, `console.warn("[resolvedJourney] age-band ≠ flat", …)` — surfaces cases where a downstream might silently pick the wrong branch.

These are dev-only, non-blocking, and satisfy the "log warning if multiple sources detected" rule without shipping console noise to production.

## Wiring — StudioV3.tsx

- Call `const resolved = useResolvedJourney(state, selectedAddOnItems, selectedAddOnsTotalEur, tourPriceTiers)` once, near the existing `selectedAddOnItems` state.
- Replace the inline IIFEs at the `FinalRevealStory` mount (lines ~2495–2542) with `perPaxEur={resolved.perPaxEur}`, `totalEur={resolved.totalEur}`, `composedStops={resolved.stops}`.
- Replace the inline IIFEs at the `CheckoutSummaryStep` mount (lines ~2610–2660) with `perPaxEur={resolved.perPaxEur}`, `totalEur={resolved.totalEur}`, `composedStops={resolved.stops}`, `adults={resolved.adults}`, `minorAges={resolved.minorAges}`.
- Delete the imports of `resolvePerPaxEur` / `resolveJourneyPricing` from `StudioV3.tsx` after the mounts stop using them directly — they now live only in the hook.

## Wiring — SignaturePriceCard.tsx

The card still owns the preview picker (traveller taps to preview per-pax at 1..8 guests). Keep the picker as a *display-only preview* — it may not become the funnel truth.

- Add optional prop `resolvedTotalEur?: number | null` and `resolvedPerPaxEur?: number | null`.
- When these are provided AND the picker is inactive (`previewGuests === null`), render `resolvedTotalEur` / `resolvedPerPaxEur` verbatim. Do not recompute.
- When the picker is active (`previewGuests !== null`), keep the existing local math — clearly labeled as "preview at N guests" (already the current UX). This is a hypothetical, not the funnel truth, so it does not violate the single-source rule.
- Keep the existing dev-only invariant check (`perPerson × guests ≈ total`) — it now doubles as a guard that the resolved values passed in stay internally consistent.
- Pass `resolvedTotalEur={resolved.totalEur}` / `resolvedPerPaxEur={resolved.perPaxEur}` from `StudioV3.tsx` at the card mount.

## What does NOT change

- `selectedAddOnsTotalEur` state and `SignaturePriceCard.onSelectionChange` — this stays the reactive source add-on toggles feed into. The hook consumes it, it isn't recomputed.
- `handleStripeCheckout` in `StudioV3.tsx` (lines ~810–870) — the Stripe edge function payload has its own server-authoritative math that must match Stripe's line items. Refactoring that is out of scope; the hook is for *display* consistency across UI surfaces. A separate future step can rebase the checkout payload on `resolved` too.
- Pricing data functions in `src/data/signatureTourPricing.ts` — untouched, still the primitive layer the hook composes.
- No changes to `CheckoutSummary.tsx` or `FinalRevealStory.tsx` internals — they already accept `perPaxEur` / `totalEur` / `composedStops` as props.

## Files touched

- **New:** `src/components/studio-v3/useResolvedJourney.ts`
- **Edit:** `src/components/studio-v3/StudioV3.tsx` (call hook once, feed both mounts and the price card from it, drop inline IIFEs and the now-unused pricing imports at that file)
- **Edit:** `src/components/studio-v3/SignaturePriceCard.tsx` (accept + honor `resolvedTotalEur` / `resolvedPerPaxEur` when picker is inactive)

## Verification

- `bunx tsgo` clean; `bunx vitest run src/data/__tests__/tier-pricing.test.ts src/data/__tests__/age-band-pricing.test.ts` still pass.
- Manual walkthrough on 393×588: toggle an add-on on refine → price card, reveal, and checkout all show the same total in the same frame.
- Family scenario (2 adults + 1 child aged 8): all three surfaces show the age-band total (child at 50%). Previously the reveal showed a higher flat number than checkout — this bug goes away.
- Dev console shows no `[resolvedJourney] …` warnings on the happy path.

## Out of scope

- Server-side checkout payload rebase (separate follow-up)
- Any UI/copy change
- `useStudioState` / persistence layer changes
- Multi-day / builder surfaces
