# Slice C — Studio Eligibility & Suitability Filtering

Reuses `TravellerComposition`, `filterSignatureCandidatesForAges`, `resolveStudioV3Route`, and the existing itinerary/quote path. No changes to Stripe, Bókun reservation, quote state machine, admin, or visuals.

## 1. Suitability metadata (new, server-owned, additive)

New shared module (safe defaults = unrestricted; never inferred from marketing):

```
src/lib/pricing/travellerSuitability.ts
```

```ts
export type TravellerSuitability = {
  minimumAge?: number;
  maximumAge?: number;
  infantsAllowed?: boolean;          // default: unrestricted (undefined = allowed)
  childSeatSupported?: boolean;
  strollerSuitable?: boolean;
  capacityCountsAllTravellers?: boolean; // default true (infants count)
};

export type SuitabilityRequirements = {
  ages: number[];                     // ALL selected ages (adults + minors)
  totalTravellers: number;
  requiresChildSeat: boolean;
  requiresStroller: boolean;
};

export type SuitabilityCheck =
  | { ok: true }
  | { ok: false; reasons: Array<
        "unsupported_age" | "capacity_exceeded"
      | "child_seat_missing" | "stroller_unsupported" | "infant_not_allowed">;
      unsupportedAges: number[]; };

export function checkTravellerSuitability(
  s: TravellerSuitability | undefined,
  req: SuitabilityRequirements,
  capacity?: number,
): SuitabilityCheck;
```

Rules:
- Age failure: any `age < minimumAge` or `age > maximumAge` → `unsupported_age` with that age listed.
- `infantsAllowed === false` and any age 0 → `infant_not_allowed` + age 0 in unsupportedAges.
- `requiresChildSeat && childSeatSupported === false` → `child_seat_missing`.
- `requiresStroller && strollerSuitable === false` → `stroller_unsupported`.
- Capacity: when `capacity` is provided, `totalTravellers > capacity` → `capacity_exceeded`. `capacityCountsAllTravellers !== false` means infants count (default true).
- Missing metadata fields = no restriction (safe default).

Suitability registries (additive, keyed, no marketing inference):

```
src/data/studioTourSuitability.ts        // per-tour (Signature/Studio candidate) map: tourId -> TravellerSuitability
src/data/studioStopSuitability.ts        // per-stop map: stopKey -> TravellerSuitability
```

Both start EMPTY (undefined = unrestricted). Populating them is a follow-up content task; Slice C just wires the plumbing so anything added takes effect.

`requiresChildSeat` / `requiresStroller` derive from existing `state.considerations` flags already present in `StudioV3State` (already tracked; see `tours.$tourId.tailor.tsx`'s stroller flag pattern). Studio has no per-composition child-seat toggle today, so the flag is `false` unless the state exposes one; we thread it through without inventing UI.

## 2. Candidate filter before generation

Extend `src/lib/pricing/filterSignatureCandidatesForAges.ts` with a superset wrapper:

```ts
export function filterStudioCandidatesBySuitability(
  composition, tours, readinessMap, requirements
): { compatible, excluded: Array<{ tourId, reasons, unsupportedAges }>, hasCompatible }
```

It runs the existing category-age filter AND `checkTravellerSuitability` (using `studioTourSuitability[tour.id]` + tour capacity if present in readiness/registry). A candidate that fails EITHER check is excluded before ranking.

Callsite in `StudioV3.tsx` (~line 3168): swap `filterSignatureCandidatesForAges` for the new wrapper. `ageFilter.compatibleTourIds` remains the exact contract handed to `resolveStudioV3Route`, so ranking/generation is unchanged.

## 3. Automatic fallback (already the behaviour)

`resolveStudioV3Route` already picks the first compatible tour and returns the "unsupported" shape only when the compatible set is empty. Slice C just narrows the input set — no engine changes.

Confirmed behaviour:
- A incompatible, B compatible → A excluded, B selected, itinerary generated normally.
- Empty compatible set → `ageFilterStatus: "unsupported"` (existing) → checkout gate blocks; no quote, no Stripe call.

## 4. Replace incompatible components (stop-level)

Add a pure helper next to curation:

```
src/components/studio-v3/stop-suitability.ts
  filterStopsBySuitability(stops, requirements, registry): {
    kept: Stop[], removedKeys: string[], swapCandidates: Stop[]
  }
```

Wire it in `StudioV3.tsx` right after `baseStops` derivation (~line 3212–3217):
1. Run `filterStopsBySuitability` on `baseStops`.
2. If a stop was removed, try to replace it from the SAME skeleton tour's `stops` pool (already the fallback pool at line 3299–3308 — reuse). Never invent stops; never cross tours.
3. If nothing suitable remains for that slot, drop it (the itinerary is shorter but still the same Studio skeleton).
4. Base quote is NOT recomputed — Studio commercial pricing is `studio-v3-private-full-day` per guest count, independent of stop composition. `itineraryRevision` (line 1096) already hashes stop labels, so it changes; `commercialProductKey` and pricing revision do not.

## 5. Studio identity guard

Assertion inside the filter/replacement path and in the quote build:
- `commercialProductKey` stays `"studio-v3-private-full-day"` (already hard-coded at lines 784, 895, 1081).
- Add a runtime guard in the wrapper: if replacement logic ever tried to substitute a Signature commercial key, throw. Reuse `isStudioCommercialProductKey` from `supabase/functions/_shared/studioCommercialPricing.ts` (mirror the constant to a client-safe helper in `src/lib/pricing/studioCommercialIdentity.ts` — pure re-export of the literal, no server import).

## 6. Tests

New file `src/__tests__/sliceC.suitability.test.ts` (Vitest, mirrors sliceB style):

1. **Infant fallback** — composition `{adults:2, minorAges:[0]}`, candidate A has `infantsAllowed:false`, candidate B unrestricted → wrapper excludes A, keeps B; `resolveStudioV3Route` picks B.
2. **No compatible candidate** — all candidates fail suitability → `hasCompatible:false`, `ageFilterStatus:"unsupported"`, no quote/checkout side-effects (assert `useBookingQuote`/`useCategoryAwareCheckoutReady` gate = false via pure helper).
3. **Compatible skeleton, incompatible stop** — `filterStopsBySuitability` removes stop X, replacement drawn from same tour pool; skeleton tour id unchanged; `commercialProductKey` unchanged; `itineraryRevision` changed vs. baseline.
4. **Capacity includes infants** — capacity 4, composition adults 3 + infant 1 → `capacity_exceeded` when `capacityCountsAllTravellers` unset (default true); passes when explicitly `false`.
5. **No Signature mapping leakage** — after any filter/replacement path, resulting quote payload's `commercialProductKey === "studio-v3-private-full-day"`; identity guard throws on attempted swap.

Also re-run existing Slice B suite (`sliceB.wiring.test.tsx`, `sliceB.closure.test.tsx`) untouched.

## Verification

```
bunx vitest run src/__tests__/sliceC.suitability.test.ts src/__tests__/sliceB.wiring.test.tsx src/__tests__/sliceB.closure.test.tsx
bunx tsgo --noEmit
```

## Files touched

New:
- `src/lib/pricing/travellerSuitability.ts`
- `src/lib/pricing/studioCommercialIdentity.ts`
- `src/data/studioTourSuitability.ts` (empty registry + type)
- `src/data/studioStopSuitability.ts` (empty registry + type)
- `src/components/studio-v3/stop-suitability.ts`
- `src/__tests__/sliceC.suitability.test.ts`

Edited (minimal):
- `src/lib/pricing/filterSignatureCandidatesForAges.ts` — add `filterStudioCandidatesBySuitability` wrapper.
- `src/components/studio-v3/StudioV3.tsx` — swap wrapper call; run `filterStopsBySuitability` after `baseStops`; identity-guard assertion at quote build.

## Out of scope

- Populating suitability data for real tours/stops (content task).
- Any UI copy/visuals; admin tools; Bókun/Stripe/quote state machine.
- Slice D.

## Return format after build

Files changed · suitability metadata added · candidate-filter result summary · component-replacement result summary · vitest output · tsgo output.
