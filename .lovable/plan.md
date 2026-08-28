# Studio V3 — Living Atlas Recovery Plan

No code was edited in this turn. Read-only inspection only. No deploy, no DB writes, no pricing changes.

## 1. Current-state diagnosis (grounded in files)

- `src/components/studio-v3/curation.ts` (3,614 lines) is the live decision authority: `scoreTourFit` (l.1057), interest→tour maps (l.297), `RHYTHM_STOP_COUNT` (l.349) + `INVESTMENT_STOP_DELTA` (l.363) drive a **moment count**, not a time budget. Line 1546 `rhythmTarget = RHYTHM_STOP_COUNT[rhythm] + delta` is composition authority today.
- Workshop→Sintra regression: `"hands-on"` is mapped in the interest table (l.297) but has no discriminating score contribution, so tours tie and array order decides. `curation.ts:141` and `livingAtlasBridge.ts:65/78` duplicate the interest→dimension mapping.
- `livingAtlasTaxonomy.ts:19` `MAX_SELECTED_DIMENSIONS = 3` silently discards extra interests; `livingAtlasBridge.ts:201` `reasons.slice(0,3)` compounds it. Style (feeling) and content (interests) collapse into the same dimension vector.
- Discovery gaps: `adaptiveQuestions.ts` is hard-scoped to Arrábida/Comporta/faith destination sets and documents "at most one extra question". Roman Talha, Tomar/Coimbra, Fátima have no public fork.
- `livingAtlasComposer.ts` is real, deterministic, region-contained — but count-driven (`targetMomentCount`, l.50/187/303) and reports `routeOrderReady: false`.
- `studioHybridComposition.ts` (latest) is additive-only and bounded by `maxPoints` derived from rhythm counts. Seam is good, policy is wrong.
- Time truth exists but is unused as authority: `signatureTours.ts` `durationHours` ("7–9h", "8–9h"), stop `durationMin` (used only for tie-breaks at l.2981/3231), `livingAtlasSchedule.ts` (haversine × 1.24, 44 km/h, 7-min floor), `livingAtlasRoutePlanner.ts` limits, and real OSRM legs via `use-route-leg-minutes.ts` → `route-legs.functions.ts`.
- Media infra exists and is unused by Studio: `builderImages.functions.ts` (`pickImagesForRoute`, `pickMoodCardImages`, `listExperienceImages`), `useBuilderImages.ts` (`useBuilderRouteImages`, `useBuilderMoodImages`), `admin.builder-images*`, `admin.image-swap`.
- UI: `StudioV3.tsx` is 5,973 lines and owns phases, beats, refinement, checkout handoff. `LivingJourneyPanel.tsx` (1,058) is the pill+drawer pattern. Duplicate authorities remain across `livingDaySpine.ts`, `studioAcknowledgement.ts`, `studioInheritedIntent.ts`, `PartialReveal.tsx`, `MapAwakens.tsx`, `DesignedForYou.tsx`, `SmartRecommendation.tsx`, `QualityScore.tsx`, `AffinityBars.tsx`.
- Dead/parallel product: `LivingAtlasStudioPage.tsx` + `LivingAtlas*Step.tsx` preview surfaces are not the production path.

## 2. Target architecture (text)

```text
StudioState (content interests | style | social | occasion | destination | exclusions)
        │
        ▼
 SemanticMemory ──► UncertaintyModel ──► QuestionDirector (0..3 forks, info-gain)
        │                                     │ allowed option IDs only
        │                                     ▼
        │                         AI phrasing (schema-validated, fallback)
        ▼
 TruthEngine (geo · time · closures · commercial · availability · privacy)
        │
        ▼
 TimeBudgetComposer  ◄── livingAtlasComposer candidates + Signature skeleton
        │  envelope 4h/6h/8-9h · dwell · transfer · buffer
        ▼
 RoutePlanner (livingAtlasSchedule estimate → OSRM legs authoritative)
        │
        ├──► CommercialLedger (source, commercialId, pricingEffect, replacementOf)
        ├──► StudioMediaResolver (experience_images)
        └──► Living Canvas UI (mood → threads → direction → composition → shaped)
                              │
                              ▼
              existing pricing/snapshot/checkout/Travel File (unchanged)
```

## 3. KEEP / REWORK / RETIRE

**KEEP unchanged:** `signatureTourPricing.ts`, `priceChangeFactors.ts`, `composerPricing.ts`, `create-signature-checkout` + `_shared/tour-operating-rules.ts`, `availability.ts`, `save/load-signature.functions.ts`, `signatureStorySnapshot.ts`, `studioWineryPresentation.ts`, `studioRouteAuthority.ts` (authority chain), `studio-analytics.ts`, `yourDayMapTruth.ts`, `use-route-leg-minutes.ts`, `route-legs.functions.ts`, `builderImages.*`, `useBuilderImages.ts`, RevealImage/motion + reduced-motion contracts, brand tokens.

**REWORK:** `curation.ts` (scoring → separated signal model; counts → time budget; keep exports as shims), `livingAtlasComposer.ts` (`targetMomentCount` → time budget; enable ordering), `studioHybridComposition.ts` (keep the seam, replace additive-only/maxPoints with replace/reorder-capable time-aware policy), `livingAtlasTaxonomy.ts` (`MAX_SELECTED_DIMENSIONS` → leads + supporting, nothing dropped), `livingAtlasBridge.ts` (single mapping source, remove style→content assumptions), `adaptiveQuestions.ts` → QuestionDirector, `studioSemanticMemory.ts` (extend to all signal classes), `LivingJourneyPanel.tsx` → Living Canvas, `StudioV3.tsx` (decompose per chapter), `MapAwakens.tsx`/`ComposerMap.tsx` (progressive geography), `FinalRevealStory.tsx`/`UnifiedYourDayRoute.tsx`/`CheckoutSummary.tsx` (one payoff).

**RETIRE (behind removal after parity):** `LivingAtlasStudioPage.tsx` and `LivingAtlas{Discovery,Shape,Result,Booking,Date}Step*.tsx` preview product, `QualityScore.tsx`, `AffinityBars.tsx`, `SmartRecommendation.tsx`, `DesignedForYou.tsx` match-style surfaces, `NextTeaser`/repeated acknowledgement paths, `studioInheritedIntent.ts` restatements, `compose-live-story` as anything but voice.

## 4. Data model / state

New pure modules under `src/components/studio-v3/`:
- `studioSignals.ts` — `{ contentInterests[], leads[1..2], style, social, occasion, destinationIntent, exclusions[] }`. No cap; leads ranked, rest supporting.
- `timeBudget.ts` — envelopes (`half≈240`, `extended≈360`, `full≈480–540`), dwell/buffer per stop kind, pickup/dropoff excluded from customer-facing budget.
- `truthEngine.ts` — validates geo/closure/commercial/availability for a candidate set.
- `commercialLedger.ts` — per-moment `{ source, commercialId, pricingEffect, includedBySkeleton, replacementOf, availabilityRequirement }`.
- `studioMediaResolver.ts` — stop image > region+activity > mood/interest > brand fallback.
`types.ts` gains these as additive optional fields; existing persisted state hydrates unchanged.

## 5. AI boundaries

Server functions only, under `src/lib/studio-v3/`:
- `questionPhrasing.functions.ts` — input: allowed option IDs + labels + ambiguity code. Output schema: `{ title, hint, options: [{ id, label, subtitle }] }`; IDs must match input exactly or the deterministic copy is used.
- `revealVoice.functions.ts` — reuse `compose-live-story` for editorial voice only.
No AI touches selection, price, geography, availability. Outage ⇒ deterministic path (scenario G).

## 6. Build sequence (each gated)

- **BUILD 0 — Truth + Reachability.** New `src/lib/studio-v3/capabilityMatrix.ts` + `admin.studio-v3-capability.tsx` (read-only) + `__tests__/studio-capability-matrix.test.ts` reachability simulator over plausible state combinations for all 12 directions, top-1/top-3 frequency diagnostics, negative-selection tests, and a read-only media coverage audit. **Gate:** every direction reachable; workshop never yields Sintra; no order-dependent wins.
- **BUILD 1 — Signals + Time + Composer.** `studioSignals.ts`, `timeBudget.ts`, `truthEngine.ts`; rework `curation.ts` scoring + `livingAtlasComposer.ts` + `studioHybridComposition.ts` to time-budgeted, replace/reorder-capable; keep `RHYTHM_STOP_COUNT` exported as compat only. **Gate:** scenarios E, F, J; pricing/checkout suites unchanged.
- **BUILD 2 — Adaptive Question Director.** `questionDirector.ts` + AI phrasing fn; retire `adaptiveQuestions.ts` one-question rule; add Fátima/Tomar, Évora/Roman Talha, Arrábida/Vicentine, tile/cheese forks. **Gate:** B, C, D, G.
- **BUILD 3 — Media + Living Canvas.** `studioMediaResolver.ts` over `useBuilderRouteImages`/`pickMoodCardImages`; `LivingCanvas.tsx` replacing pill+drawer; threads morph in place. **Gate:** H; 393×852 one dominant decision per viewport.
- **BUILD 4 — Map + Shape + Manipulation.** Progressive geography, OSRM validation, swap/remove/undo through `commercialLedger.ts`. **Gate:** A, I; no repeat upsell of an already-composed paid moment.
- **BUILD 5 — Your Day + Conversion.** Single payoff reveal reusing chosen imagery; edit/undo; Reserve. **Gate:** K, L; instant-checkout semantics intact.

## 7. Tests

Vitest: capability matrix, signal separation, time budget vs envelopes, truth engine rejections, ledger idempotency, media resolver hierarchy, AI schema validation + fallback. Playwright at 393×852 and desktop: scenarios A–L, plus offline-AI and blocked-images runs. CI: extend `.github/workflows/studio-v3-p0-regression.yml` and `living-atlas-ci.yml`.

## 8. Risks / compatibility

- `curation.ts` is load-bearing for checkout labels — every rework keeps `resolveStudioV3Route`'s output contract (`routePoints`, `composedRoutePoints`) and the `studioRouteAuthority` chain.
- Persisted/saved Signatures must hydrate: new state fields optional, old counts tolerated.
- Time-budget composition can change composed days; BUILD 1 ships behind a build-time flag with a parity diff report before flipping.
- OSRM latency: estimate first, OSRM refines; never gate UI.
