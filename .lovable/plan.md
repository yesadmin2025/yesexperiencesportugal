## Context

Site already routes every tour content surface (tour detail, Studio V3 reveal, checkout inclusions, experiences cards, booking form, JSON-LD) through `getTourContent(tourId)`, which returns the verified Viator payload from `SIGNATURE_SOURCE_OF_TRUTH`. Coverage is 12/12 tours verified. Locked snapshot + parity tests (`sot-viator-parity.test.ts`, 30 tests) already guard rendered output against the SoT block.

What's still there: **legacy fallback fields** on `signatureTours[].description/highlights/included/stops[].story` and `VIATOR_META[].overview/included/editorialChapters`, plus the fallback branches in read helpers and card grids. They never execute at runtime today (SoT is 12/12), but they let future edits silently reintroduce non-Viator copy on any surface if a tour is ever dropped from SoT — which is exactly what the docs call "Phase C" cleanup.

This plan finishes Phase C: retire the fallbacks so Viator truth is the only path.

## Plan

### 1. Delete legacy content fallbacks in read helpers

- `src/lib/tourContent.ts` — drop the `else` branch that reads `VIATOR_META[tourId].overview/included` and `tour.highlights/included/stops`. If `SIGNATURE_SOURCE_OF_TRUTH[tourId]` is missing, throw (guarantees Viator truth or fail loudly).
- `src/lib/checkout/inclusions.ts` — remove VIATOR_META fallback; SoT included only.
- `src/components/studio-v3/FinalRevealStory.tsx` (line 195, 245–247) — remove `tour.stops` / `tour.included` fallbacks.
- `src/components/studio-v3/signatureStorySnapshot.ts` (lines 79–80) — same.
- `src/components/SimpleBookingForm.tsx` (lines 171–199) — same.
- `src/routes/experiences.tsx` & `src/routes/pt.experiences.tsx` — remove `meta?.stops` branch; keep only `content.itinerary` chapter labels or `content.highlights`.
- `src/routes/tours.$tourId.tsx` line 478 — drop `tour.highlights` fallback.

### 2. Retire legacy content fields on the data files

- `src/data/signatureTours.ts` — remove `description`, `highlights`, `included`, and per-stop `story` fields on every Signature blueprint. Keep `id`, `title`, `region`, `img`, `stops[].label/coords`, `bookingUrl`, and pricing anchors — those are geometry/media, not editorial copy.
- `src/data/signatureToursViator.ts` — remove `overview`, `included`, `editorialChapters` from every `VIATOR_META` entry. Keep `priceTiersEUR`, `reviews`, `gallery`, `viatorProductCode` — truth-passed operational data.
- Update `SignatureTour` and `VIATOR_META` TS types accordingly so the compiler flags any future consumer that tries to read a retired field.

### 3. Guardrail test

Add `src/__tests__/no-legacy-tour-content.test.ts`:

- Assert `SignatureTour` type has no `description`/`highlights`/`included`/`story` keys.
- Assert `ViatorMeta` type has no `overview`/`included`/`editorialChapters` keys.
- Grep `src/**/*.{ts,tsx}` and fail if any file (outside SoT + this test) references those field names on a tour/meta object.

### 4. Verify

- Run `bun test` — expect the existing 30 SoT parity tests + new guardrail to pass; fix any TS compile errors surfaced by step 1 & 2.
- Spot-check `/tours/arrabida-wine-allinclusive`, `/tours/troia-comporta`, and Studio V3 reveal in preview to confirm rendered content is unchanged (it should be — SoT was already the effective source).

## Outcome

Every tour surface on the site reads Viator truth from a single verified block, with no dormant legacy path that could silently reintroduce invented copy. Future tour additions must land in `SIGNATURE_SOURCE_OF_TRUTH` via `/admin/sot-refresh` or the site fails loudly instead of falling back to fiction. On the tour card on the highlights remove Lisbon and add real differentiation. The content is viator but with yes storytelling tone. The maps should be rrendering on every tour page and is not. 