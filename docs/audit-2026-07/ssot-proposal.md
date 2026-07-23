# Pricing SSOT — Proposal (audit only)

## Current sources of truth (four, inconsistent)

| Source | Used by | Problem |
|---|---|---|
| `signatureTours[id].priceFrom` | cards, "From €" labels, some fallbacks | Manually maintained; drifts from real tier data |
| `signatureToursViator.ts` `VIATOR_META[id].priceTiersEUR` | `resolvePerPaxEur` | Immutable in code; only 9/12 tours have `tier: 1` |
| `public.tour_price_tiers` (DB) | runtime overrides on product & studio | Populated for all 12; overrides the code tiers when present |
| Flat deltas in tailor route (`ADD_STOP_DELTA=20`, `REMOVE_STOP_DELTA=10`, `floor=0.85 × base`) | Tailor only | Not tier-aware, not policy-aware |

## Proposed SSOT (one shape, one owner)

Add `src/config/pricing.ts` — pure module, no side effects:

```ts
export interface TierPricing {
  platform: number;               // NEW column — what your platform listing charges
  direct: number;                 // = round(platform * 0.85)
  min: number;                    // = round(direct * 0.70) — Tailor floor
}
export interface TourPricing {
  tourId: string;
  tiers: Record<1|2|3|4|5|6|7|8, TierPricing | null>; // null = not bookable at that group size
  fromEur: number;                // = min direct across non-null tiers
}
export function priceForParty(tourId, adults, minorAges): JourneyPricing;
export function priceForTailor(tourId, adults, minorAges, removals, addOns): TailorPricing;
```

Hydration order (deterministic, never fabricates):
1. `public.tour_price_tiers.tiers` (runtime, all 12 tours present today).
2. `VIATOR_META[id].priceTiersEUR` (fallback for missing tiers or new tours).
3. Reject / null (never fall back to `priceFrom` for tier data — `priceFrom` becomes purely a card display fallback and is recomputed by the SSOT).

Age bands stay in `signatureTourPricing.ts` (already SSOT-shaped and mirrored in `supabase/functions/_shared/pricing.ts`) — the new module imports them.

## Migration steps (Phase 2, awaiting approval)

1. Migrate `tour_price_tiers` schema:
   ```sql
   ALTER TABLE public.tour_price_tiers ADD COLUMN platform_tiers jsonb;
   UPDATE public.tour_price_tiers SET platform_tiers = tiers;  -- current = platform
   -- keep `tiers` for backwards compat until callers migrate
   ```
2. New view `public.tour_pricing_v` computes `direct` + `min` server-side so RLS-safe reads can rely on it.
3. `resolvePerPaxEur` becomes a thin re-export from `src/config/pricing.ts` for backwards compat; callers slowly move to `priceForParty`.
4. Every card / product / Tailor / Studio / checkout price flows from `priceForParty` — no local hard-coded numbers, no per-component "€138" strings.
5. Server-side `create-signature-checkout` + `create-builder-checkout` reuse the same SSOT (imported from `supabase/functions/_shared/pricing.ts` — we mirror the module the way age bands already are).

## Files that would change in Phase 2 (proposal only, none touched now)

| Layer | File | Change |
|---|---|---|
| SSOT | `src/config/pricing.ts` | NEW module |
| SSOT (server mirror) | `supabase/functions/_shared/pricing-tiers.ts` | NEW; identical shape |
| DB | new migration for `platform_tiers` + `tour_pricing_v` | NEW |
| Cards | `src/routes/experiences.tsx`, `pt.experiences.tsx`, `day-tours.tsx`, `pt.day-tours.tsx`, `index.tsx`, `pt.index.tsx`, `src/components/home/ThreePathsSection.tsx`, `PathfinderQuiz.tsx:490` | Read `fromEur` from SSOT |
| Product | `src/routes/tours.$tourId.tsx`, `src/components/SimpleBookingForm.tsx`, `PriceCurrencyChip.tsx`, `ui/PricePerPerson.tsx` | Read `priceForParty` |
| Tailor | `src/routes/tours.$tourId.tailor.tsx` (esp. lines 420–495) | Replace flat deltas with `priceForTailor`; add principal-vs-descriptive classifier consuming `tailorBlueprints.ts` |
| Studio | `src/components/studio-v3/StudioV3.tsx`, `SignaturePriceCard.tsx`, `useResolvedJourney.ts`, `composerPricing.ts` | Wire composer + new pricing; see `studio-findings.md` |
| Checkout | `supabase/functions/create-signature-checkout/index.ts`, `create-builder-checkout/index.ts`, `_shared/pricing.ts` | Import server SSOT; drop the client-passed `totalEur` in favour of server recompute |
| Confirmation | `src/routes/booking-confirmed.tsx` | Read totals from server row, not URL |

## Non-goals (this pass and Phase 2)

- No new UI, no promo language, no strikethrough platform price unless we can prove it's live.
- No new tables beyond `platform_tiers` column and one view.
- No change to age-band engine, add-on unit engine, or Bókun inclusion contract.
