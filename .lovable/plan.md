## 1. Tailor page — show adult/child tiered pricing

**File:** `src/routes/tours.$tourId.tailor.tsx`

The tailor summary card currently shows one line: `€{estimatedPrice} / adult`. It doesn't itemise minors even though `composition.adults` and `composition.minorAges` are already tracked, and the reserve handler already computes a full age-banded `summaryJourney` via `resolveJourneyPricing`.

**Change:** Lift that same age-banded resolution into a `useMemo` at render time, then render the shared `<PriceBreakdownRows journeyLines={...} label="Travellers" />` (already used by Studio V3 checkout) above the `Indicative total` row when the party has minors AND every minor age is filled in. The total line stays; the `/ adult` suffix is dropped in favour of the per-band rows, matching the on-page summary in Studio V3 and the confirmation email.

The tailored signature card has too much information inside the cover image, should be polished 

Additional total shown at the bottom becomes the true party total (`summaryJourney.totalEur`) instead of just the adult unit, keeping the "Indicative total" honest for mixed parties. Adults-only bookings render exactly as today (single line, no band breakdown) — no visual change when there are no minors.

## 2. Signature listing — per-tour rating as trust signal

**File:** `src/routes/experiences.tsx`

Each card's meta strip is currently: `Region · Duration · From €X`. Add the tour's real rating from `VIATOR_META[t.id]` (already imported) as a fourth pill, positioned first so it acts as a trust anchor:

```
★ 4.9 · 210 reviews  ·  Region  ·  Duration  ·  From €X
```

Only rendered when `meta?.reviewCount > 0` (silent fallback — no fake stars). Uses the existing gold star token, same 11px uppercase tracking as the rest of the strip, tabular-nums for the numbers. No new component — inline span with a `Star` icon from `lucide-react`, matching the treatment already used on the tour detail page (`tours.$tourId.tsx` lines 301–313).

## Out of scope

- No changes to server pricing, checkout flow, email, or `TourReviews` component.
- No copy/style changes elsewhere.
- Homepage signature strip untouched (different surface).