# Studio v2 — The best builder we've ever made

## North star (Studio Bible re-read)

The Studio is **cinematic discovery**, not a configurator. Today's Refine stage edges back toward "panel UI" (cards + buttons + swap drawer). To honor the bible *and* deliver a truly interactive, intelligent, real, predictive builder, the engine must become **the protagonist** — the traveller barely touches controls, and Portugal composes itself in front of them.

Pre-flight checks applied to every item below:
- Removes UI before adding it
- Engine decides — never asks
- Real Portuguese sensory anchors, never labels
- Confidence escalates, choices compress
- Cinema beats software

---

## What's wrong today

1. `RefineStage` is the most "software-like" surface in the whole flow — explicit Swap / Remove / Reorder buttons, warning lists, empty states. Violates principles 1, 7, 9.
2. The engine returns a static ranked list once. There's no **predictive** layer reading user micro-behavior (hover, dwell, undo, re-enter).
3. Routes are computed as straight haversine lines — not "real". No actual drive geometry, no time-of-day awareness, no light/weather mood.
4. The map is decorative — it doesn't react, anticipate, or reveal.
5. Multi-day is hidden behind a separate fallback — should feel like the **highest tier**, not an escape hatch.
6. No memory across visits — every session restarts cold.

---

## The plan — 6 moves, ordered by impact

### Move 1 — Replace Refine with **Living Itinerary** (cinematic, gesture-first)
Kill cards + Swap/Remove/Reorder buttons. Replace with a **single vertical scroll** of full-bleed scenes, each anchored to one real stop:

- One scene = real image + 2-line atmospheric line + faint time-of-day strip ("late light · 17:40")
- Gestures only: **swipe left = "not this one"** (engine quietly substitutes the next best-fit real stop), **long-press = "more like this"** (engine tightens around that mood), **pinch the timeline ribbon at top = compress/expand the day**.
- No visible buttons. No warning banners. If a swap breaks feasibility, the engine **silently re-routes** and shows a one-line atmospheric note ("the day breathes better starting from the coast").
- Reorder via drag on the thin left-side ribbon (one finger). No arrows.

This collapses Refine from "editor" to "conversation with the day".

### Move 2 — **Predictive engine** (the intelligence layer)
Promote `engine.ts` from one-shot ranker to a live predictor running on every micro-signal:

- **Inputs**: profile + every gesture (swipe direction, dwell ms per scene, long-press, scrub speed on timeline, re-entry to a previous scene, swap acceptance rate per mood tag).
- **Model** (server fn, no extra deps): online Bayesian update of `priorityWeights` + `paceConfidence` + `moodVector` (food/coastal/culture/wellness/social/quiet). Each gesture nudges weights; engine recomposes the tail of the day in the background.
- **Output**: a *forecasted next stop* prefetched (image, route geometry, drive time) **before** the user swipes — so substitutions feel instant and inevitable, not algorithmic.
- Persisted per `share_token` so returning visitors resume with a sharpened profile, not from zero.

### Move 3 — **Real routes**, not haversine
Replace straight lines with real driving geometry + truthful timing:

- Add Mapbox Directions API call inside `itinerary.server.ts` (key already in secrets pattern). Cache responses keyed by `(from_stop, to_stop)` in a new `builder_route_cache` table — keeps cost flat.
- Compute real `drive_minutes`, `distance_km`, and a polyline. Use these for feasibility checks (replacing the current haversine + warnings).
- Map redraws the **actual road**, animated as a gold line tracing on each recomposition. Camera eases between stops on swipe.
- Time-of-day: each stop gets a predicted arrival clock based on real drive times + dwell — feeds the atmospheric line ("golden hour over the Douro").

### Move 4 — **Map as co-protagonist**, not chrome
The map stops being a sticky panel above cards. Two states only:
- **Ambient mode** (default during Living Itinerary scroll): map is a faint, blurred layer *behind* the scene, slowly panning between current and next stop. No controls visible.
- **Reveal mode** (engine-triggered once `revealConfidence ≥ 0.75`): scene fades, map blooms full-screen for ~4s with the full traced day, then collapses back. This is the emotional payoff — never user-triggered.

No persistent zoom/pan/recenter controls. Region-zoom memory (existing rule) still applies internally.

### Move 5 — **Multi-day as the apex tier**, not a fallback
When the engine detects (a) duration > 1 day, or (b) priority spread that can't fit one day truthfully, the flow elevates instead of escalating to "contact":

- The Living Itinerary scroll extends — day-break is a single full-bleed scene of **silence**: an Atlantic horizon, one line ("the day exhales — tomorrow begins in stone"). No "Day 2 of 3" badge.
- A discreet `Composed privately` mark appears once per multi-day journey — the only acknowledgment that this is the rarefied tier.
- Secure CTA copy shifts to "Reserve this private composition" only on multi-day.

### Move 6 — **Memory across visits + share = invitation**
- Returning visitors (cookie `studio_anon_id`) load with prior `moodVector` already warmed → first scene is sharper, fewer beats needed.
- Share token URL renders as a **received invitation**, not "view itinerary": named composer line ("Composed for you by YES, Tuesday afternoon"), no edit chrome until they explicitly choose to make it theirs.

---

## Technical plan (mapped to files)

| Move | Files |
|---|---|
| 1 | rewrite `RefineStage.tsx` → `LivingItinerary.tsx`; remove Swap drawer; add `useGestureEngine` hook |
| 2 | extend `engine.ts` with `updateWeights(signal)` + `forecastNext(state)`; new `engine.server.ts` for persistence; new table `studio_v2_predictions` (session_id, weights jsonb, updated_at) |
| 3 | new `routing.server.ts` calling Mapbox Directions; new table `builder_route_cache` (from_key, to_key, polyline, drive_minutes, distance_km); update `PremiumMap`/`BuilderMap` to consume polylines |
| 4 | `LivingItinerary` owns map state; remove sticky map wrapper; add `RevealMapMoment` component |
| 5 | engine returns `days[]` instead of `stops[]`; `LivingItinerary` renders DayBreakScene between days |
| 6 | extend `sessions.functions.ts` with `loadWarmProfile(anonId)`; new `/i/$token` invitation route distinct from `/s/$token` editor |

Telemetry additions: `studio_v2_gesture_swipe`, `studio_v2_gesture_longpress`, `studio_v2_forecast_hit` (forecasted stop accepted), `studio_v2_reveal_moment_shown`, `studio_v2_daybreak_shown`.

Secrets needed: `MAPBOX_ACCESS_TOKEN` (already used elsewhere — confirm before Move 3).

## Suggested order (incremental, each ship-able)

1. **F.6 ✅** Move 3 — real OSRM driving routes + `builder_route_cache`
2. **F.7 ✅** Move 2 — predictive engine (`studio_v2_predictions`, `applySignal`, `forecastNext`, signal wiring)
3. **F.8 ✅** Move 1 — `LivingItinerary` replaces Refine surface: full-bleed cinematic scenes per stop, swipe-left = silent substitution, long-press = mood anchor, dwell observer feeds engine. Classic Refine kept behind "Controls" escape hatch.
4. **F.9** Move 4 — map as co-protagonist + Reveal moment
5. **F.10** Move 5 — multi-day as apex (pricing stays silent until human composer confirms)
6. **F.11** Move 6 — warm memory + invitation route

## Answers locked

1. Gestures-only Refine — **both**: ship cinematic gesture layer + keep existing Swap/Remove/Reorder buttons as a visible A11y escape hatch.
2. Multi-day pricing — **silent until human composer confirms**. No engine-shown ranges.
3. Routing — **OSRM** (free, already operational).

