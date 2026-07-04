
# Fix pass — Builder / Reveal / Signature / Tailor / Checkout

Before I touch anything I'll run the existing vitest and tier-pricing suite so we have a clean baseline. Then five focused fixes, in this order.

## 1 · Builder / Studio V3 — stop landing on Arrábida every time

Symptom: whatever the user picks, the reveal is Arrábida wine.

Cause (in `src/components/studio-v3/curation.ts`):
- Hard fallback to `arrabida-wine-allinclusive` when the candidate pool is empty.
- A +3 boost fires whenever `interests` contains `gastronomy` OR `wine`, and gastronomy is on by default in a lot of flows — so wine tours dominate.
- Pickup affinity multiplier (×1.2) further favors Lisbon-area tours (Arrábida is Lisbon-area).
- `FEELING_TO_TOURS` for "romance", "wine-food", "slow-luxury" all list Arrábida wine first.

Fixes:
- Replace the blanket Arrábida fallback with a **feeling-aware fallback table** (coastal → wild-beaches-picnic, culture → tomar-coimbra, hidden → southwest-vicentine, etc.) — Arrábida wine only when feeling is wine-food and interests support it.
- Only apply the wine +3 boost when the user **explicitly** chose `wine-food` OR the wine/gastronomy interest was picked as a top-2 (not as a default).
- Reduce pickup-affinity weight from 1.2 → 0.8 so it breaks ties but never overrides the feeling.
- Rotate the FEELING_TO_TOURS order so no single tour appears first in more than two feelings.
- Add a Vitest suite `curation.pick.test.ts` that asserts for each `(feeling × top-interest)` combination the picked tour id is **not** `arrabida-wine-allinclusive` unless that combination is genuinely wine-led. Covers 20+ cases.

## 2 · Reveal — clarity of the final screen

Symptom: "the final page, the reveal, it's very mixed up. You can't understand what's going on."

Fixes in `LivingJourneyPanel.tsx` + `StudioV3.tsx` reveal step:
- Collapse the reveal to a clear vertical rhythm: **hero image → one sentence "Your day" → 4-item timeline → real map → price card → CTA**. Remove the running-investment ribbon, affinity bars, quality score, and micro-badges from the reveal (keep them in debug only).
- Standardise timeline items to a single card pattern: time · title · one-line story. No stacked eyebrows/pull-quotes.
- Move the "Reshape / Refine / Tailor" actions into a single tertiary row under the CTA, not floating over the map.

## 3 · Reveal map — realistic distances

Symptom: the reveal map is stylised so users can't tell where they're going.

Fixes in `StudioV3SignatureMap.tsx` / `ComposerMap.tsx`:
- Switch the reveal map from the stylised silhouette to the existing **Mapbox `PremiumMap`/`BuilderMap`** primitive already used in the builder (per project memory: reuse those, don't build a new map).
- Draw the route between resolved stop coordinates from `src/data/stopCoords.ts` using the Mapbox Directions layer (already wired for builder). Show a scale bar and total km/drive-time under the map.
- Keep the poetic silhouette only for the pre-reveal "map awakens" transition, not the final reveal.

## 4 · Signature pages — remove title overlay on hero

Symptom: "the words on top of the picture are unnecessary."

Fix in `src/routes/tours.$tourId.tsx`:
- Remove the absolute-positioned title/eyebrow block that sits over the hero image (`absolute inset-x-0 bottom-0 …`).
- Keep the hero as a clean cinematic image with a subtle bottom gradient only for legibility of the small tour meta (duration · group size), or drop the gradient entirely if no text remains.
- Move title, eyebrow, and lede to the editorial block **below** the hero, matching Signature/Editorial v2 rhythm.
- Do the same audit on `alentejo-wine-tour-from-lisbon.tsx`, `arrabida-wine-tour.tsx`, `evora-alentejo-wine-tour.tsx`, `sintra-day-tour-from-lisbon.tsx`, `private-wine-tour-lisbon.tsx`, `wine-tours-lisbon.tsx` — they share the same overlay pattern.

## 5 · Tailor — no unexplained "locked" stops

Symptom: "you put some that can't be changed but they should be changeable — if a guest doesn't want the market, they should swap it."

Fix in `src/routes/tours.$tourId.tailor.tsx` + `src/data/tailorBlueprints.ts`:
- Add `skippable?: boolean` to `BlueprintStop`. Default `true` for all Core stops **except** true operator-locked anchors (hotel pickup, the winery block for wine tours, workshop for tile tours) — anything else (market, viewpoint, generic lunch) becomes skippable.
- Render Core stops with a subtle "Skip this stop" toggle when `skippable`. When skipped, show a small note: "Time freed — your guide will suggest an alternative or extend the next stop." Feasibility recalculates immediately.
- Copy update: the "Always included" heading becomes **"Included by default"**, and a one-line footnote explains that a guest can trade a stop for time elsewhere.

## 6 · Checkout inclusions — no invented copy

Symptom: "the inclusions on the checkout page, they are not correct."

Fix in `supabase/functions/create-signature-checkout/index.ts`:
- Today the Stripe line-item description falls back to `copy.eyebrow` when no Bókun inclusions are returned — that reads like invented copy. Replace the fallback with the Signature tour's real `included[]` from `VIATOR_META[tourId].included` (already source-of-truth) or the blueprint's `core[]` labels. Never marketing prose.
- Cap to 4 items, comma-joined, prefixed "Includes: ".
- Explicitly exclude `stopLabels` from the description on tailored bookings (already the case) — verify with a Deno test.

---

## Technical details

**Files changed**
- `src/components/studio-v3/curation.ts` — fallback table, weight tuning, wine-boost gate.
- `src/components/studio-v3/__tests__/curation.pick.test.ts` — new suite (20+ cases).
- `src/components/studio-v3/LivingJourneyPanel.tsx`, `StudioV3.tsx` — reveal simplification.
- `src/components/studio-v3/StudioV3SignatureMap.tsx` + reuse of `BuilderMap`/`PremiumMap` — real map.
- `src/routes/tours.$tourId.tsx` and the 6 sibling tour route files — remove hero title overlay.
- `src/data/tailorBlueprints.ts` — add `skippable`, tag core stops.
- `src/routes/tours.$tourId.tailor.tsx` — skip-toggle UI on Core stops.
- `supabase/functions/create-signature-checkout/index.ts` — description fallback from `VIATOR_META.included`.
- `supabase/functions/create-signature-checkout/*_test.ts` — new Deno test for description.

**Test pass**
1. `bunx vitest run` — including the new `curation.pick.test.ts` and existing tier-pricing suite.
2. `supabase test edge_functions create-signature-checkout` — verify inclusions come from `VIATOR_META.included` and never from `stopLabels` for tailored bookings.
3. Playwright smoke: run Studio V3 with 4 different feeling picks and assert the resolved tour id varies.

**Out of scope for this pass**
- Redesigning the Studio intro copy.
- Rewriting `BuilderMap` — we reuse it, we don't refactor it.
- Any change to Bókun/Stripe wiring beyond the description string.

Approve and I'll execute in that order, testing after each step.
