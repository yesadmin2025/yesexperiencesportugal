# P8 — Unified "Your Day" surface (read-only architecture audit)

HEAD verified: `aad17ed51b9c509711fd51322376229cc1c8d6b9`. Working tree clean except platform-generated `src/generated/brand-audit.json` (out of scope, untouched). Nothing was edited; this is the plan only.

## 1. Current fragmentation (file/line)

After Logistics the traveller is promoted through **three** full screens.

- `src/components/studio-v3/curation.ts:2584-2609` — `STUDIO_V3_PHASE_ORDER` contains `"map"`, `"storyboard"`, `"confirmation"` as three consecutive relevant phases.
- `curation.ts:2528-2562` — `isPhaseRelevant` returns `false` for occasion/considerations/language/investment/destination/date/pickup/guests, `true` for map, storyboard, confirmation. So `getNextPhase(state, "logistics")` (`curation.ts:2619-2627`) resolves to `"map"`, then `"storyboard"`, then `"confirmation"`.
- `StudioV3.tsx:2909-2938` — phase `map` renders `MapAwakens` (750 LOC) with its own `YourDayFrame` (`MapAwakens.tsx:390`), map-or-timeline stage (`:415`, `:529`), moments card (`:546`), timings (`:611`) and its own CTA "Personalise a few details" (`:702-716`) → `advance("storyboard")`.
- `StudioV3.tsx:2940-2966` — phase `storyboard` renders `CurtainRise` + `StoryboardHandoff` (`StudioV3.tsx:3511`+, render body `4107-4800`): a **second** `YourDayFrame` with a second title (`4214-4225`), a second map `studio-v3-reveal-map` (`4243`) + legend (`4254-4292`), `WhyRouteWorks` (`4305`), `OtherDirections` (`4310`), stops editor (`4318`), refine intents (`4335`), price/investment UI, and CTA `studio-v3-handoff-primary` (`4768`) → `advance("confirmation")`.
- `StudioV3.tsx:2968-2994` — phase `confirmation` renders **again** `WhyRouteWorks` (`2971`) and `OtherDirections` (`2977`) plus `FinalRevealStory` (688 LOC): third headline (`FinalRevealStory.tsx:346`), third facts/signals block (`:370-387`), third timeline (`:415`), third investment block (`:463`), inclusions (`:531`), CTA (`:650`) → `advance("guestDetails")`, back → `storyboard` (`:674`).

Net duplication: two "Your Day" headers, two maps/timelines, two moment lists, two investment surfaces, `WhyRouteWorks` + `OtherDirections` rendered twice, three CTAs before Guest Details.

Supporting truth modules (unchanged by P8): `yourDayMapTruth.ts` (map vs timeline resolver), `YourDayTimeline.tsx`, `YourDayFrame.tsx`, `WhyRouteWorks.tsx` (caps 4 reasons, fires `gaStudioRecommendationRevealed`), `OtherDirections.tsx`, `filterRevealSignals` from `studioAcknowledgement.ts` (`FinalRevealStory.tsx:37,201`).

## 2. Canonical phase: `"storyboard"`

- It already owns the executable refine controls, stops editor, canonical price/investment UI, `data-testid="studio-v3-reveal"` and `data-studio-v3-screen="refine"` — the surfaces P8 must NOT change mathematically.
- `getNextPhase` already falls back to `"storyboard"` (`curation.ts:2621,2626`), so a broken/unknown saved phase lands on the unified surface with no extra code path.
- `StudioV3ProgressStepper` already groups `map | storyboard | confirmation` into the single `compose` / "Your day" beat (`StudioV3ProgressStepper.tsx:41,71-73`), so the stepper needs no relabelling.
- `map` and `confirmation` remain in the `StudioV3Phase` union and in `STUDIO_V3_PHASE_ORDER`; they simply become never-asked (`isPhaseRelevant → false`), exactly like `investment`/`destination` today.

## 3. Hydration, back-navigation, stepper rules

1. `isPhaseRelevant`: add `if (phase === "map" || phase === "confirmation") return false;` — `getNextPhase(state, "logistics")` then resolves to `"storyboard"` in one hop. No new ordering array.
2. Hydration canonicalization: in `readPersistedStudioState` (`StudioV3.tsx:771-787`), after the existing `PHASE_ORDER.includes` + `NON_RESTORABLE_PHASES` checks, map `"map" | "confirmation" → "storyboard"` via one pure helper `canonicalStudioPhase(phase)`. Old sessions and deep links hydrate directly onto the unified surface — single state write, no transient render of a removed screen, therefore no flicker.
3. Same helper is applied inside `advance()` (`:1290-1325`) so any legacy call site or test that requests `map`/`confirmation` is normalized before the forward-only index guard runs. Guard stays forward-only, so `storyboard → storyboard` is a no-op, not a loop.
4. `back()` (`:1327-1345`) already walks backwards skipping non-relevant phases, so from `storyboard` it lands on `logistics` (or the last relevant question) automatically once map/confirmation are non-relevant. The unified surface's Back keeps calling `back()` with no hint.
5. Forward CTA on the unified surface goes straight to `advance("guestDetails")`. `guestDetails` back target is switched from `"confirmation"` to `"storyboard"` (via the same canonicalizer).
6. `NON_RESTORABLE_PHASES` unchanged. `studioV3Progress` (`:544-560`) keeps treating storyboard as the composition beat; the `intro/storyboard/map` special-case there is left intact.

## 4. Component disposition

Retained, unchanged behaviour:
- `yourDayMapTruth.ts`, `YourDayTimeline`, `YourDayFrame`, `RevealRouteMap` + `StudioV3SignatureMap`, stops editor / `RefineStopCard` / refine intents, `SignaturePriceCard`, `RunningInvestmentRibbon`, `InvestmentLedger`, `useResolvedJourney`, `CurtainRise`, `GuestDetailsStep`, `CheckoutSummary`.

Moved into the single `storyboard` render path:
- Map-or-timeline stage + ordered moments + timings from `MapAwakens` (`MapAwakens.tsx:415-640`) become the top of the unified surface, replacing the duplicate `studio-v3-reveal-map` header block; `studio-v3-reveal-map` testid is kept on the map container.
- Lightweight story: the letter/headline + facts + filtered signals part of `FinalRevealStory` (`:308-415`) renders below the moments, once. Director's Read themes stay suppressed through `filterRevealSignals`.

Reduced:
- `MapAwakens` loses its own `YourDayFrame`, its own CTA (`:702-716`) and its autoplay-gated continue; it becomes a presentational stage used by the unified surface (or its stage is extracted into `YourDaySurface`). Its `data-testid`s (`studio-v3-your-day-stage`, `studio-v3-moments-card`, `studio-v3-moment-timings`) are preserved.
- `FinalRevealStory` loses its duplicate investment block (`:463-529`), duplicate timeline (`:415`) and its own back/continue chrome; canonical price UI on the unified surface is the only money surface. `studio-v3-final-reveal-*` testids that survive keep their names.
- `WhyRouteWorks`: rendered exactly once, immediately after the ordered moments (`testId="studio-v3-travel-file-reasons"` kept; the `studio-v3-living-atlas-reasons` instance at `:2971` is removed). `gaStudioRecommendationRevealed` therefore fires once per journey instead of twice.
- `OtherDirections`: single quiet footer instance, below the primary CTA, secondary weight.

Removed from the render path (files kept for hydration/back-compat, no deletions of phase union values):
- phase blocks `StudioV3.tsx:2909-2938` (map) and `:2968-2994` (confirmation).
- second `YourDayFrame` title (`:4214-4225`) and the intermediate CTA `studio-v3-handoff-primary` become one primary CTA to Guest Details.

Final content order on the one surface: journey title/region → map (if `resolveYourDayMapTruth().mode === "map"`) else timeline → ordered moments → lightweight story → refine controls (stops, swap/add, refine intents) → one `Why this fits` cue → canonical investment UI (unchanged math, no P9 ribbon-timing change) → one primary CTA to Guest Details → quiet `OtherDirections` footer.

## 5. Allowed P8 files

Production:
- `src/components/studio-v3/StudioV3.tsx`
- `src/components/studio-v3/curation.ts` (only `isPhaseRelevant`, plus the comment on the order array)
- `src/components/studio-v3/MapAwakens.tsx`
- `src/components/studio-v3/FinalRevealStory.tsx`
- `src/components/studio-v3/SignatureDayReveal.tsx` (re-export only, if the reveal body is hoisted)
- one new pure module `src/components/studio-v3/studioPhaseCanonical.ts` (`canonicalStudioPhase`)
- optionally one new presentational `src/components/studio-v3/YourDaySurface.tsx` if the moved stage needs a home outside the 5.6k-line file

Tests / E2E: `src/components/studio-v3/__tests__/studio-p8-unified-your-day.test.tsx` (new), plus intentional updates to `reveal-section-order.test.ts`, `map-awakens-cta-contract.test.tsx`, `your-day-surface.test.tsx`, `phase-7d-hydration.test.ts`, `progress-stepper*.test.tsx`, `stepper-telemetry.test.tsx`, `final-reveal-*.test.tsx`, `e2e/studio-v3-walk-to-reveal.ts`, `e2e/studio-v3-reveal-walkthrough.spec.ts`, `e2e/studio-v3-moments-to-reveal-mobile.spec.ts`, `e2e/studio-v3-map-legend.spec.ts`, `e2e/studio-v3-exit-intent.spec.ts`, `e2e/studio-v3-let-yes-decide-mobile.spec.ts`, `e2e/studio-v3-add-ons-total.spec.ts`.

Explicitly untouched: pricing config/functions, `signatureTourPricing`, add-on formulas, `resolveJourneyPricing`, Stripe edge functions/checkout, Supabase, Travel File security, `RunningInvestmentRibbon` timing, `directorsRead*`, `studioAcknowledgement.ts`, analytics taxonomy, generated files, brand audit, dependencies.

## 6. Acceptance criteria

- Logistics → exactly one screen before Guest Details; no `map`/`confirmation` render.
- Content order matches §4; each of title, map/timeline, moments, story, why-this-fits, investment, primary CTA appears exactly once in the DOM.
- Director's Read themes never repeated (existing P6/P7 tests stay green).
- Pricing DOM values byte-identical to pre-P8 for the same state (base, add-ons, total, per-person).
- Hydrating a saved session with `phase: "map"` or `"confirmation"` renders the unified surface on first paint; no second render of a removed screen (assert single state commit), no back/forward loop.
- 393px: single column, no horizontal scroll, all interactive targets ≥44px, map legend does not overlap.
- a11y: one `h1`/`h2` hierarchy without duplicates, ordered moments remain an `ol`, focus moves to the surface heading on entry, visible focus rings, reduced-motion honoured (no autoplay dependency for CTA reachability).
- Perf: no additional map instance mounted (one map, not two); CTA interactive before any autoplay/reel completes.

## 7. Tests

New focused (`studio-p8-unified-your-day.test.tsx`):
- `canonicalStudioPhase`: `map|confirmation → storyboard`; every other union value unchanged.
- `isPhaseRelevant("map"|"confirmation") === false`; `getNextPhase(state, "logistics") === "storyboard"`.
- `back()` from `storyboard` lands on the last relevant question (logistics), never on `map`.
- Unified surface renders exactly one of each: `studio-v3-your-day-stage`/timeline, moments list, `studio-v3-travel-file-reasons`, investment block, primary CTA; zero `studio-v3-living-atlas-reasons`.
- Hydration from `{phase:"confirmation"}` mounts the unified surface directly.

Intentional updates: `reveal-section-order.test.ts` expected order extended with moments/story/why anchors; `map-awakens-cta-contract.test.tsx` retargeted to the unified CTA; `your-day-surface.test.tsx` asserts the single-surface mode contract; E2E walkers drop the two intermediate clicks.

## 8. Risks & rollback

- **Largest risk**: `StoryboardHandoff` is a ~1300-line render inside a 5.6k-line file; moving the map stage and story into it can disturb the price/add-on wiring. Mitigation: move JSX only, keep every prop and testid name, run the pricing parity suites (`price-source-of-truth`, `add-ons-*`, `studio-v3-p3b-live-investment`) unchanged.
- **Second risk**: hidden `phase === "map" | "storyboard" | "confirmation"` conditionals at `StudioV3.tsx:549`, `1221`, `1237-1238`, `2206-2208`, `2243-2245` gate exit-intent, lead-sheet and chrome behaviour. Each must be re-read and reduced to `storyboard` deliberately, not blanket-replaced.
- **Third risk**: E2E specs that click the intermediate CTAs will fail loudly (intended) — they are updated in the same slice, not skipped.
- Rollback: single-commit revert. Because no phase union values, pricing code, or persisted-state shape change, reverting restores the three-screen flow with old sessions still hydratable.
