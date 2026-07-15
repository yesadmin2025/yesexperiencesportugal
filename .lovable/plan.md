## Audit — current Tailor winery limits

**Rigid caps found:**
- `src/data/tailorBlueprints.ts` — every wine-forward tour uses a single fixed `pickCount`:
  - `arrabida-wine-allinclusive` → `pickCount: 2` (pool of 5: JMF, Bacalhôa, Catralvos, Piloto, Palmela)
  - `tiles-workshop` → `pickCount: 1` (pool of 3: JMF, Bacalhôa, Catralvos)
  - `sintra-lisboa-wine` → `pickCount: 1` (pool includes Colares winery)
  - `alentejo-wine` → `pickCount: 1` (pool of 5 Alentejo wineries)
  - `azeitao-cheese` → 1 winery in Core, no choice pool
  - `arrabida-wine-boat` → Comporta winery in Core only
- `src/routes/tours.$tourId.tailor.tsx` (line 861) — UI hard-blocks selecting more than `pickCount`: `atLimit = !on && choiceSelected.size >= blueprint.choice.pickCount`.
- `src/lib/feasibility.ts` (line 154) — engine rejects >3 wineries: `if (wineries.length > 3) feasible = false`.

**Operational data currently in the codebase**
- ✅ `durationMin: 75` per winery in `regionStopPool.ts` (uniform default, not per-supplier confirmed).
- ✅ Category-level dwell in `feasibility.ts` (`winery: 90` min).
- ❌ Real lat/lng — `stopCoords.ts` only holds SVG-viewbox coords, not routable geographies.
- ❌ Opening hours / windows per winery.
- ❌ Separate visit vs tasting duration.
- ❌ Real driving-time cache for winery-to-winery legs (no rows in `builder_route_cache` populated for these pairs; `drivingFromPrevMinutes` is not passed for blueprint stops today).
- ❌ Approved per-winery price / extension surcharge (blueprint uses generic `upchargePerPaxEUR`, unused for choice pool).
- ❌ Age-eligibility / adults-only supplier flags.
- ❌ Manual-vs-instant confirmation status per supplier.

## What this plan will and won't do

The user's guardrail is strict: **"Use only approved supplier and pricing rules. Do not use straight-line distance or AI-generated driving estimates."** Since the per-winery hours, coordinates, tasting split, extension price, and age rules do not yet exist in the codebase, this plan splits the work into two phases:

**Phase 1 — Code changes (ship now):**

1. **`src/data/tailorBlueprints.ts`**
   - Replace `choice.pickCount: number` with `choice.pickMin: number` + `choice.pickMax: number`.
   - Backfill existing wine-forward tours:
     - `arrabida-wine-allinclusive` → `pickMin: 2, pickMax: 4`
     - `tiles-workshop` → `pickMin: 1, pickMax: 2` (short day, workshop-anchored — safer max until data confirmed)
     - `sintra-lisboa-wine` → `pickMin: 1, pickMax: 2`
     - `alentejo-wine` → `pickMin: 1, pickMax: 4`
   - Non-wine choice pools keep `pickMin === pickMax` (behaviour unchanged).
   - Extend `BlueprintStop` with **optional, non-invented** operational fields, unused unless populated:
     ```ts
     coords?: { lat: number; lng: number };            // approved supplier lat/lng
     openingWindow?: { open: string; close: string };  // "HH:mm"
     visitMinutes?: number;                            // separate visit component
     tastingMinutes?: number;                          // separate tasting component
     pricePerPaxEUR?: number;                          // approved supplier price
     ageEligibility?: { minAge?: number; adultsOnly?: boolean };
     confirmationStatus?: "instant" | "manual";
     ```
     No defaults invented. If a field is absent, the engine skips that check and the UI shows the "manual confirmation required" state for that winery.

2. **`src/lib/feasibility.ts`**
   - Raise the wine cap from 3 → 4 (`if (wineries.length > 4) feasible = false`).
   - Keep the "3+ wineries needs lunch between them" soft warning (extend from 2+ to keep intent).
   - Add a new warning at exactly 4 wineries: *"Four wineries is the safe maximum — palate fatigue past that point."*
   - Driving-time evaluation stays honest: when `drivingFromPrevMinutes` is not supplied for a pair (data gap), the engine keeps its current behaviour (skip the leg) rather than fabricating a haversine estimate. The Tailor UI (see #3) surfaces a "manual confirmation" chip when this happens.

3. **`src/routes/tours.$tourId.tailor.tsx`**
   - Replace the hard `atLimit = choiceSelected.size >= pickCount` block with a soft, feasibility-driven check: allow adding up to `pickMax`; if the resulting `evaluateDay` returns `!feasible`, show the toast with the reason and refuse.
   - Before applying the change, show an inline consequence line: *"Adding {winery} adds approximately {N} min to your day."* using either (a) the summed `visitMinutes + tastingMinutes` if populated, else (b) the current 90-min winery default from `feasibility.ts` — clearly labelled as "estimated".
   - When any selected winery has `confirmationStatus === "manual"` (or is missing operational data), show a "manual confirmation" badge next to the live quote and disable "Reserve instantly", surfacing "Request confirmation" instead. Do not invent an extension price.
   - When a fourth winery is added and any core/optional stop is still active that could be dropped to fit, show a plain-language nudge listing the removable stops (Livramento Market, viewpoints, village walks, tile stops, coastal stops) — **without auto-removing**. Removal remains an explicit user action.
   - Keep the composition (adults + minors) already resolved by `useResolvedJourney`. Add a wine-specific line under the winery list when any traveller is a minor: *"Wine tasting is offered to adults only — minors visit the estate without tasting."* — no invented "children's menu" price. Age-eligibility gate only fires when `ageEligibility.adultsOnly === true` is present on the supplier (otherwise the copy above is shown, no block).

4. **`src/components/studio-v3/curation.ts` and `useResolvedJourney.ts`**
   - Ensure the resolved journey object includes the full ordered winery list (already does via `stops`). Verify checkout summary + confirmation render the wineries in the same order — no changes expected, but a regression test will lock it (see verification).

5. **New test — `src/data/__tests__/tailor-winery-selection.test.ts`**
   Covers the 7 verification scenarios from the brief using existing blueprint data (with hours + coords stubbed via the new optional fields under `__test-fixtures__/`, not committed to real blueprints).

**Phase 2 — Owner data (documented, NOT invented):**

Produce `docs/tailor-winery-operational-data.md` listing every winery currently referenced with the empty fields the owner must fill:
- coords (lat/lng)
- opening window
- visit + tasting split
- approved per-winery pricePerPaxEUR (and any approved 4-winery extension price)
- age eligibility
- confirmation status (instant vs manual)

Until Phase 2 is filled per supplier, that winery will:
- appear in the pool,
- be selectable up to `pickMax`,
- surface "manual confirmation required" (no invented extension price shown), and
- fall back to the category default `visitMinutes = 90` for the day-timing preview only.

Nothing about the day is booked as "instant" unless every selected winery has approved instant-status data.

## Files touched (Phase 1)

- `src/data/tailorBlueprints.ts`
- `src/lib/feasibility.ts`
- `src/routes/tours.$tourId.tailor.tsx`
- `src/data/__tests__/tailor-winery-selection.test.ts` (new)
- `docs/tailor-winery-operational-data.md` (new, ownership handoff)

## Verification (aligned to the brief)

- 2 wineries + market — feasible, warnings clear.
- 3 wineries after removing viewpoint — feasible.
- 4 wineries after removing market + one optional — feasible.
- 4 wineries with (stubbed) closed opening window — engine returns `!feasible` with the reason.
- 4 wineries with any winery lacking operational data — reserve-instantly disabled, "request confirmation" surfaced, no invented price.
- Mixed adults + minors — composition renders throughout, "adults only" advisory or supplier-flag block applies where present.
- Final story, map, timeline, live quote, checkout summary, confirmation all read the same ordered winery list (locked by a snapshot test on the resolved journey).

## Report I will deliver after Phase 1

1. Files changed.
2. Tours supported today: `arrabida-wine-allinclusive`, `tiles-workshop`, `sintra-lisboa-wine`, `alentejo-wine`, `azeitao-cheese`, `arrabida-wine-boat` — with the pickMax set per above.
3. Wineries in scope: JMF, Quinta da Bacalhôa, Quinta de Catralvos, Quinta do Piloto, Adega Cooperativa de Palmela, Adega Regional de Colares, Herdade da Comporta, and the 5 Alentejo estates in the Alentejo blueprint.
4. Missing operational data per winery (Phase 2 handoff doc).
5. Manual-confirmation cases: every winery lacking approved instant-status data will be flagged manual until Phase 2 is filled — I will list them explicitly.
6. Test results.
