## Fix `/tours/*/tailor` Live summary to reflect actual selections

### Problem
On tours that have a Tailor Blueprint (core + choice + optional), the Live summary panel still reads from `tour.stops` (the full Viator pool). Result: it lists every possible stop, the "Itinerary (X of Y)" counter uses the pool as denominator, and "Indicative total" only reacts to legacy `added`/`skipped` (not the real `choiceSelected` / `optionalSelected` / `skippedCore` state).

### Fix (logic only — no palette/layout changes)

In `src/routes/tours.$tourId.tailor.tsx`:

1. **Derive the actually-selected stops.** Add a `summaryStops` memo that, when `blueprint` exists, returns:
   - `blueprint.core.filter(s => !skippedCore.has(s.id))` (fixed included, minus any skipped-core)
   - `blueprint.choice.options.filter(o => choiceSelected.has(o.id))` (the exactly-N chosen, e.g. 2 wineries)
   - `blueprint.optional.filter(o => optionalSelected.has(o.id))` (only viewpoints/extras user actively added)
   
   When no blueprint exists, fall back to today's `keptStops` behaviour so non-blueprint tours are unchanged.

2. **Denominator in sync.** Change `Itinerary ({keptStops.length} of {(tour.stops ?? []).length})` to use `summaryStops.length` and, for blueprint tours, a `summaryTotal` = core (non-skipped) + `choice.pickCount` + selected optional count — so it reads "Itinerary (8 of 8)" when the required choice is complete, and honestly shows "(7 of 8)" if the user un-picked a winery.

3. **Itinerary list.** Replace the `keptStops.map(...)` with `summaryStops.map(...)` (each item has `label` on both blueprint and Viator stops, so the render stays identical).

4. **Indicative total reflects real selections.** Extend `estimatedPrice` for blueprint tours so:
   - `skippedCore.size` applies `-REMOVE_STOP_DELTA` each,
   - `optionalSelected.size` applies `+ADD_STOP_DELTA` each,
   - `choiceSelected` at the required `pickCount` is treated as baseline (no delta); anything under pickCount doesn't inflate price.
   
   Legacy `added`/`skipped` deltas continue to apply only for non-blueprint tours.

5. **Reserve button guard.** Update the disabled check from `keptStops.length === 0` to `summaryStops.length === 0` so the CTA reflects the same source of truth.

### Guardrails
- No JSX/layout, palette, typography, or motion changes.
- No changes to blueprint data, feasibility engine, checkout payload shape, or non-blueprint tours' behaviour.
- Typecheck with `tsgo --noEmit` after the edit.
