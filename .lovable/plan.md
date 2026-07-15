## Phase B — composer stops in the reveal, nothing else

Goal: the reveal ("Your day, composed") reads its stop list from `composeStudioJourney` when the flag is on. Pricing, checkout, map markers, tour-id resolution stay on `resolveStudioV3Route`. Two travellers with materially different answers see materially different **reveal stops** — the Phase A guarantee, now visible in the UI.

Out of scope this turn (explicitly deferred to Phase D/F):
- Composer-driven pricing (still needs `signatureTours` + tiers)
- Checkout payload (still ships Signature `tourId`)
- Map markers, `LivingJourneyPanel`, `CurtainRise`, `RunningInvestmentRibbon`, `ComposerMap` rewrites
- Deleting `curation.ts` or `resolveStudioV3Route`

### What ships

1. **`src/lib/studio-v3/composerAdapter.ts`** (new)
   - `adaptStateToComposeInput(state: StudioV3State): ComposeInput | null` — maps `feeling/companions/rhythm/interests/pickup/occasion/considerations/adults/minorAges` + current month/weekday into the composer's typed input. Returns `null` when required fields are missing.
   - `pickupToRegion(pickup)` — reuses the same pickup→region logic curation.ts already uses (single import, no duplication).
   - `interestsToStudioInterests(state.interests)` — vocabulary map (studio "wine/coast/culture/gastronomy/wellness/hidden" → composer's enum, already 1:1).
   - `investmentToBudgetTier(state.investment)` → `essential | signature | rare`.

2. **`src/components/studio-v3/useResolvedJourney.ts`** — extend, don't replace
   - Add `composedStops` field to `ResolvedJourney`, computed via `composeStudioJourney` when adapter returns non-null and flag is on; else `null`.
   - `stops` field logic (existing chain: editedRoutePoints → resolveStudioV3Route → tour.stops) is **unchanged**. Pricing math is **unchanged**.
   - Consumers opt in by reading `composedStops` explicitly.

3. **Flag**: `STUDIO_V3_COMPOSER_REVEAL` — `import.meta.env.DEV || localStorage.getItem("studio-v3-composer-reveal") === "1"` (same pattern as `STUDIO_V3_OPTIONAL_STOPS_ENABLED` in curation.ts). Off in production, on in dev + QA opt-in. Zero prod-user impact this turn.

4. **Reveal surface only** — `SignatureDayReveal` (re-exported from `StudioV3.tsx`'s `StoryboardHandoff`)
   - Find the block that renders the stop list inside the reveal (single JSX map over `resolved.stops`).
   - When `composedStops` is present, render those instead, using each stop's `name`, `blurb`, `rationale` (rationale becomes a small "Picked for your …" line, matches existing "story" slot visually).
   - Preserve the existing DOM structure (same wrapper, same test ids) — the only change is the source array. No new snapshot churn.

5. **Test — `src/components/studio-v3/__tests__/reveal-composer-stops.test.ts`** (new, ~80 lines)
   - Renders `StudioV3` with the flag on and two contrasting fixtures (solo-wine-slow vs family-coast-full).
   - Asserts the reveal stop labels differ across the two states.
   - Asserts pricing element renders unchanged (i.e. `€X pp` still present) — protects the "we did not break checkout" invariant.

6. **Guardrails**
   - No edits to `curation.ts`, `signatureTours`, pricing files, checkout, map components.
   - No edits to any existing test other than reading them to confirm nothing regresses.
   - Full `bunx vitest run` must stay green.

### Technical notes

- The composer needs `weekday` + `month` — use `new Date()` on render (memoized per day) to avoid re-composing on every keystroke.
- `regionStops.ts` currently has full coverage only for the pickup regions the adapter needs (Lisbon, Sintra, Arrábida). If `pickupToRegion` returns a region with <3 stops in the pool, `composedStops` returns `null` and the reveal falls through to the current `resolveStudioV3Route` output. Documented in the adapter file header.
- Rationale strings (e.g. "Picked for your wine focus · slow rhythm") are new copy but derive mechanically from the traveller's own inputs — not invented facts about stops. Complies with the "no invented content" memory rule because stop **names/blurbs/coords** still come from the approved `regionStops.ts` pool.

### Deliverables

- 1 new file: `composerAdapter.ts`
- 1 extended file: `useResolvedJourney.ts` (add field, no behavior change to existing consumers)
- 1 edited file: `StudioV3.tsx` (reveal stop map only — ~15-line change)
- 1 new test file
- Green full suite, flag off by default

### What "Phase B done" looks like

- QA can flip `localStorage.setItem("studio-v3-composer-reveal","1")` and see the reveal stops change per answer profile — proving the Phase A engine is wired to the UI.
- Zero production behavior change until we flip the default in Phase D alongside the pricing swap.

Approve to proceed, or tell me to widen/narrow the surface.