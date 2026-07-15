# Phase A — Studio composition engine (composer + tests only)

Goal: replace the Signature-clone `curateJourney` with a true regional composer that assembles a day from the approved stop inventory, driven by traveller answers. **No UI, pricing, or checkout changes this turn** — those come in Phases B / D / E once the engine is green.

Success = the same 5 traveller profiles produce 5 materially different journeys, none of which are just a reordered Signature template.

## 1. New file: `src/lib/studio-v3/composeStudioJourney.ts`

Pure function. No I/O, no React. Signature:

```ts
composeStudioJourney(input: {
  region: RegionKey;
  rhythm: "slow" | "balanced" | "full";
  interests: Interest[];       // wine, coast, culture, gastronomy, wellness, hidden
  who: "solo" | "couple" | "family" | "friends";
  minorAges: number[];         // gates family-incompatible stops
  budgetTier: "essential" | "signature" | "rare";
  weekday: number;             // 1–7, for closedDays
  month: number;               // 1–12, for seasonalMonths
}) => ComposedJourney
```

### Pool
Single union pool from the approved regional inventory (`REGION_STOPS` in `src/data/regionStops.ts`, ~62 stops) filtered by:
- `region` match
- `!closedDays.includes(weekday)`
- in `seasonalMonths` window
- family-safe when `minorAges.length > 0` (drop `adultOnly` tag + any stop with `minAge` above the youngest child)
- has valid `coords` (drops the stops missing geo that produced the 187 km ghost leg)

### Scoring
Weighted score per stop, no Signature-template bias:
- interest match: +6 per matched `affinity.style`
- rhythm match: +3 for energy fit (slow↔slow, full↔vivid)
- who match: +2 for `affinity.companions`
- budget tier fit: +2 for `tier <= budgetTier`
- diversity penalty: −4 per additional stop of the same `kind` already picked (respect `regionRules.kindCaps`)
- `priority * 0.6` as tiebreaker

### Assembly
Greedy pick sorted by score, then:
- enforce `regionRules.maxStops`, `kindCaps`, `dayLengthMinutes[rhythm]`
- **route sanity guard** on every candidate leg: reject if haversine > 60 km OR estimated drive > `maxHopMinutes`
- final sort by `timeOfDay` preference (morning → sunset)
- return `{ stops, drives, totals, rationale, warnings }` where `rationale` is a per-stop reason string ("Picked for your wine focus + slow rhythm") used later by the "Why this fits you" surface

## 2. Test suite: `src/lib/studio-v3/__tests__/composeStudioJourney.test.ts`

Five scenarios, each asserts (a) valid composition, (b) no leg > 60 km haversine, (c) result is **not** equal to any existing Signature tour's stop id sequence, (d) key interest is reflected in ≥ 40% of picks:

1. **Wine-focused adult couple** — Arrábida, slow, wine+gastronomy, couple, no minors → wineries/cellars dominate, no adventure stops
2. **Family with minors (ages 6, 9)** — Sintra-Cascais, balanced, coast+culture, family → zero adultOnly, zero minAge violations
3. **Coast-focused journey** — Arrábida, balanced, coast, couple → viewpoints/beaches dominate, ≤1 winery
4. **Culture-focused journey** — Lisbon-coast, balanced, culture+heritage, couple → palaces/heritage dominate, no wineries
5. **Same region, different preferences** — two Arrábida runs (wine+slow vs coast+full) must produce disjoint stop sets (Jaccard < 0.5)

Cross-scenario assertion: the 5 composed stop-id sequences are all pairwise distinct AND none match any Signature tour's canonical stop sequence.

## 3. Route-leg guard shared helper

Extract the haversine/OSRM sanity check already added to `route-legs.functions.ts` into `src/lib/studio-v3/route-sanity.ts` so the composer uses the exact same threshold logic. No behavior change to the existing runtime path.

## 4. Not touched this turn

- `StudioV3.tsx` reveal surfaces
- `curation.ts` (still powers the current live Studio until Phase B swaps it)
- pricing / `resolveJourneyPricing`
- checkout wiring
- `AddMomentSheet`, `AddOnsPanel`, "Why this fits you" copy surfaces

Those land in Phases B → E, gated on Phase A tests staying green.

## Deliverables at end of turn

1. `composeStudioJourney.ts` + `route-sanity.ts`
2. 5 passing scenario tests + 1 cross-scenario distinctness test
3. Printed test output showing the 5 composed itineraries (stop labels + drive minutes) so you can eyeball that they read as genuinely different journeys before we wire them into the UI
