# Studio V3 — "Compose, don't return Signatures"

## Current behaviour (confirmed by code read)

Studio V3 (`src/components/studio-v3/StudioV3.tsx`) is architecturally **a Signature resolver**, not a composer:

- `StudioV3.tsx:4412` selects `signatureTours.find(t => t.id === resolved.skeletonTourKey)` — the reveal is anchored to one existing Signature.
- `SmartRecommendation.tsx:43` returns a single Signature per (region, mood) combination.
- Pricing goes through `resolvePerPaxEur` on that resolved Signature (`StudioV3.tsx:81, 4070` → `SignaturePriceCard`).
- `src/lib/studio-v3/composerPricing.ts` already exists with an anchor-tour lookup — this is the closest thing to a real composer today, but it is not wired to the reveal path (comment: "Phase D — adapter + tests only, no UI wiring").
- The reveal `FinalRevealStory.tsx` and checkout drawer both operate on the resolved Signature id, not a synthesised route.
- No blocker prevents the guest picking incompatible regions — Studio silently maps them to whichever anchor `SmartRecommendation` returns.

## Violations of the spec

| ID | Finding | Location |
|---|---|---|
| S-1 | Studio final result is an existing Signature, not an original day. | `StudioV3.tsx:4412` |
| S-2 | Reveal card is `SignaturePriceCard`, whose whole reason is one Signature. | `StudioV3.tsx:4070` |
| S-3 | Region incompatibility (e.g. Arrábida + Évora chosen) is not detected — falls back to nearest anchor. | `SmartRecommendation.tsx` |
| S-4 | Composer pricing exists but is unused in production. | `src/lib/studio-v3/composerPricing.ts` header |
| S-5 | Studio "route" doesn't recompose stops from `regionStops.ts` / `stopOperational.ts`; it uses the anchor Signature's `tour.stops` verbatim. | `useResolvedJourney.ts` |
| S-6 | Module data (`stopOperational.ts`) exists but lacks capacity + explicit compatibility rules per stop; `builder_compatibility_rules` table is populated but not read by V3. | data files |

## Phase 2 direction (proposed, not implemented)

1. **Composer path** — replace `resolved.skeletonTourKey` with an original itinerary object `{ regionAnchor, stopIds[], durationMin, perPaxEur }` produced by extending `composerPricing.ts` from anchor-only pricing to full composition using `regionStops` + `stopGeo` + `stopOperational`.
2. **Reveal card** — render a new `ComposedJourneyCard` (subclass of `SignaturePriceCard` presentation but backed by the composed object). Signature identity chip becomes "Custom private day — [region]".
3. **Region-conflict UX** — when the guest ticks two non-adjacent regions, offer three explicit choices: (a) pick one region; (b) add a second day; (c) route to Travel Designer (`/multi-day`). No silent fallback.
4. **Explicit fallback** — if the composed set of stops is smaller than a viable day (< 3 stops or < 5h), Studio may **suggest** a Signature as a shortcut, clearly labelled: "Prefer our ready-made version? → Signature X." That is a suggestion, not a substitution.
5. **Data completeness** — add `capacity`, `openingHours`, `compatibilityGroup` to `stopOperational.ts` for every stop used by Studio (currently missing on ~40% of pool per `regionStopPool.ts`).
6. **Reveal → checkout** — checkout drawer must accept the composed shape (new `create-studio-composed-checkout` server fn) instead of routing everything through `create-signature-checkout`.

## Guardrails to add in Phase 2
- Composed itinerary MUST reject non-adjacent region mixes.
- Composed price = Σ per-stop direct price (from stop's home Signature tier tables) with a shared transport line, floored at the sum of stop-level `minimumOperationalPrice`.
- Never write a synthesised itinerary to `bookings` unless every stop is real, geo-resolved, capacity-checked, and time-boxed by `estimateStopDuration()`.
