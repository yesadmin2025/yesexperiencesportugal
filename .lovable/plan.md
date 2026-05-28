
# Experience Studio — Cinematic Hybrid Refactor

Reshape `/studio-v2` from a guided consultation stepper into a 6-phase cinematic journey with two intelligent completion paths. This is a structural rewrite of the Studio shell, not the engine — the existing itinerary engine, profile model, real-stops data, and `studio_v2_bookings` persistence stay. The shell, pacing, and conversion layer change.

## Scope (in this pass)

1. **New phase-based shell** replacing the current SEQUENCE/step model
2. **Dual-path conversion** (Instant Booking vs Refine With a Local Host) with AI confidence routing
3. **Embedded Stripe checkout in-scene** (no redirect break) for instant path
4. **Premium WhatsApp handoff** for refine path, emotionally continuous (not "support escalation")
5. Visual + motion polish per cinematic principles (one emotional layer at a time)

Out of scope: changes to Signature/Tailored/Builder pages, brand palette, homepage motion, or the underlying scoring engine.

## Phase Architecture

Replace current `SEQUENCE` array in `StudioV2.tsx` with a `PhaseController` driving 6 phases:

```text
Phase 0 PROLOGUE     → existing StoryOpener + DriftScene atmosphere, no CTAs for ~3s
Phase 1 FEELING      → 6 emotion cards (slow & romantic / wild coast / hidden / celebration /
                       soulful food & wine / peaceful escape) over real footage. NO place names.
Phase 2 WHO & RHYTHM → couple|family|solo|friends + slow|adventurous|relaxed|discovery
                       via SensePair-style visual diptychs, not form fields
Phase 3 INTENTION    → MicroFictionScene variants; imagery & overlay tint shift with answers
Phase 4 REVELATION   → "Portugal is responding…" beat, map fades in at 8% opacity,
                       stops surface one-by-one from real builder_stops data
Phase 5 LIVING JOURNEY → existing real itinerary + BuilderMap promoted to protagonist,
                       ribbon timeline, drag-to-reorder kept, no chrome
Phase 6 CONVERSION   → dual-path decision (see below)
```

Each phase = single dominant emotional layer. Hard rule enforced by `<PhaseStage>` wrapper that fades out previous layer fully before next mounts (no overlap chrome).

## Dual-Path Conversion Logic

New file: `src/lib/studio-v2/conversion-router.ts`

```ts
type ConversionPath = 'instant' | 'refine' | 'both';

decideConversionPath(profile, itinerary) → ConversionPath
  instant  if: confidence ≥ 0.7 AND all stops are real AND group ≤ 8
              AND no luxury_tier='ultra' AND no hardConstraints
  refine   if: confidence < 0.55 OR ultra tier OR corporate occasion
              OR group > 8 OR hardConstraints present
  both     otherwise
```

Phase 6 component branches:
- `InstantBookingScene` — preserves itinerary canvas, slides Stripe Embedded Checkout up as a sheet over the dimmed map. Uses existing `create-builder-checkout` edge function (already does server-side pricing). Success → cinematic "Your journey is set" coda, not a redirect.
- `RefineWithLocalScene` — introduces a named host ("Mariana, your local in Lisbon") with portrait, hands draft to WhatsApp pre-filled with the full real itinerary + profile summary. Persists draft via existing `createCustomBookingDraft` so the host can open `/checkout/$token`.
- `DualOfferScene` — presents both as equal cinematic choices, not primary/secondary.

## Files

**New**
- `src/components/studio-v2/PhaseController.tsx` — phase state machine + transitions
- `src/components/studio-v2/PhaseStage.tsx` — single-layer enforcement wrapper
- `src/components/studio-v2/phases/PrologueScene.tsx`
- `src/components/studio-v2/phases/FeelingScene.tsx`
- `src/components/studio-v2/phases/WhoRhythmScene.tsx`
- `src/components/studio-v2/phases/IntentionScene.tsx`
- `src/components/studio-v2/phases/RevelationScene.tsx`
- `src/components/studio-v2/phases/LivingJourneyScene.tsx`
- `src/components/studio-v2/phases/conversion/InstantBookingScene.tsx`
- `src/components/studio-v2/phases/conversion/RefineWithLocalScene.tsx`
- `src/components/studio-v2/phases/conversion/DualOfferScene.tsx`
- `src/components/studio-v2/phases/conversion/EmbeddedCheckoutSheet.tsx`
- `src/lib/studio-v2/conversion-router.ts`

**Refactored**
- `src/components/studio-v2/StudioV2.tsx` — becomes thin host that mounts `<PhaseController>`. All existing scene logic moves into phase files. Profile/engine wiring preserved.
- `src/components/studio-v2/PersistentChatFab.tsx` — hidden in Phase 0–4 (would compete with atmosphere), surfaces in Phase 5 only.

**Reused as-is**
- `src/lib/studio-v2/engine.ts`, `profile.ts`, `intent-infer.ts`, `itinerary.functions.ts`, `story.functions.ts`
- `src/lib/studio-v2/bookings.functions.ts` (already supports the draft → host workflow)
- `supabase/functions/create-builder-checkout/index.ts` (already validates & prices server-side)
- `BuilderMap` / `PremiumMap` for Phase 5

## Cinematic Rules (enforced)

- One emotional layer visible at any time (`PhaseStage` unmounts predecessor)
- No stepper, no progress bar, no breadcrumbs in Phase 0–4
- Subtle "Chapter II" eyebrow only from Phase 5 onward
- All transitions: 600–900ms fade + 12–16px translate, respects `prefers-reduced-motion`
- Map opacity progression: 0% (P0–P3) → 8% (P4) → 100% (P5+)
- Stripe checkout never opens in a new tab; embedded sheet with cinematic backdrop
- Refine handoff uses host portrait + name + locale, not generic "contact us" copy

## Technical Notes

- Conversion routing is pure & deterministic — easy to unit test
- Stripe Embedded uses existing `getStripe()` + `clientSecret` flow from `create-builder-checkout`; new component just wraps `<EmbeddedCheckoutProvider>` in a sheet
- WhatsApp message builder extends existing `whatsappHref` helper with itinerary summary
- No DB migration needed — `studio_v2_bookings` already has `status: 'draft' | 'submitted'` and all fields required for the refine handoff
- No new env vars; no new edge functions

## Acceptance

- Entering `/studio-v2` shows fullscreen footage with no CTAs for ~3s
- Choosing a feeling never reveals a place name in Phase 1–2
- Map remains hidden until Phase 4
- High-confidence test profile (couple, balanced, 2 adults, no constraints) routes to Instant; ultra-tier or 10-person celebration routes to Refine; mid-confidence presents both
- Stripe checkout opens inline (sheet), not via redirect
- Refine path opens WhatsApp with the actual real itinerary (stop names from `builder_stops`) prefilled and persists a draft retrievable at `/checkout/$token`
- `tsc --noEmit` passes; no new console errors in the flow

Approve to proceed, or tell me which phase to cut/expand.
