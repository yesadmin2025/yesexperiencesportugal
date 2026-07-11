
# Studio V3 — P0 Implementation Plan

Ships the four BLOCKER-severity fixes from `.lovable/studio-v3-audit.md`, one focused change per finding, each with a Playwright regression test on mobile (393×588) so the fix stays fixed.

## 1. Storytelling reveal renders empty on mobile

**Files:** `src/components/studio-v3/FinalRevealStory.tsx`, `src/components/studio-v3/SignatureDayReveal.tsx` (re-export), `src/components/studio-v3/StudioV3.tsx` (mount site).

**Diagnosis pass first** — run the walker with `page.evaluate` dumping the reveal subtree's outerHTML + computed opacity/transform/display of the root container and its first three descendants; also log which of these is truthy: parchment image `naturalWidth`, `useReducedMotion()` gate, IntersectionObserver-driven reveal class, scroll container `scrollTop`. Only then pick the fix from:
- image-load gate → paint text at opacity 1 immediately, fade parchment behind
- reveal-on-scroll gate → mount already-revealed on first paint when phase === `storytelling`
- scroll-container offset → force `scrollTo(0,0)` on phase transition

**Regression test:** new `e2e/studio-v3-storytelling-reveal-non-empty-mobile.spec.ts`. Walks intro → refine → tap "See my signature story", then asserts within 2500 ms on mobile-chromium (393×588):
- `[data-testid="studio-v3-final-reveal"]` visible AND `innerText.length > 40`
- `[data-testid="studio-v3-party-total"]` visible with `€` and a positive integer
- `[data-testid="studio-v3-add-ons-total"]` present (may be `€0`)

## 2. Retire Montserrat / Georgia fallbacks + italic-Fraunces-as-body

**Files:** `src/components/studio-v3/StudioV3Intro.tsx` (lines 89, 96, 109, 168, 175, 203, 252, 259, 343, 353), `src/components/studio-v3/ChoiceGrid.tsx` (lines 6 comment, 97, 105, 107), `src/components/studio-v3/MapAwakens.tsx` (line 524), `src/components/studio-v3/StudioV3.tsx` (line 1982 hint), storytelling voice overlay in `FinalRevealStory.tsx`.

**Rule:** everywhere those files set `fontFamily: "var(--font-display, 'Montserrat', ...)"` or `"var(--font-serif, Georgia, ...)"`, replace with `var(--font-editorial)` (headings) or `var(--font-body)` (body/whisper/hint/meta). Whisper subtitles on Feeling tiles and any body-length paragraph switch to Inter regular, `text-[13px]`, `--charcoal-soft`, non-italic. Italic Fraunces stays ONLY inside H1/H2 emphasis spans.

**Regression test:** new `e2e/studio-v3-typography-two-family-mobile.spec.ts`. On each phase (intro / feeling / map / refine / storytelling / guest-details), assert:
- no computed `font-family` on any visible element in `[data-studio-v3-root]` contains `Montserrat`, `Georgia`, `Times`, or `Cormorant`
- any element with computed `font-style: italic` has a tag name in `H1..H6` OR sits inside one
- console during the walk emits zero `[font-fallback]` warnings (hook the detector, fail on any)

## 3. Map beat delivers on its intro promise

**Files:** `src/components/studio-v3/MapAwakens.tsx`, `src/components/studio-v3/StudioV3Intro.tsx` (intro chips copy).

**Approach:** replace the `PortugalSilhouette` SVG blob at the `map` phase with the existing `EditorialMap` / Mapbox render used by `LivingMap` (already imported elsewhere) so the beat actually shows a coastline + route line + stops. Also:
- badge collision: give the drive-time badge `min-w-[52px] whitespace-nowrap`, stack the label under it on `<sm`
- stop-name truncation: replace `truncate` with `line-clamp-2` on `.route-breakdown-row [data-stop-name]`; drop leading `Lisbon → ` when pickup city already shown in badge
- meta wording: `1 DRIVING` → `1 leg · 34.7 km`
- eyebrow contrast: `--gold` → `--gold-soft` on dark surfaces
- retire the italic Fraunces line "Matching wine to one real route." (handled in fix #2)

If the Mapbox mount is heavier than we want here, fallback plan: keep the silhouette but rebrand the beat header to "Route timeline" and update the intro chip copy in `StudioV3Intro.tsx` so the promise matches what renders. Pick Mapbox by default; only fall back if the reveal-blank fix (#1) shows the map render is what's blocking paint.

**Regression test:** extend `e2e/studio-v3-map-legend.spec.ts` (or a new sibling if simpler). On mobile:
- map surface has `[data-testid="studio-v3-live-map"]` visible with a rendered `<canvas>` OR SVG containing at least one `<path>` for a route line
- drive-time badge and its label never overlap (`getBoundingClientRect` non-intersecting)
- no route-breakdown row shows a `…` truncation

## 4. Guest-details footer clipping "FINAL PRICE SHO…"

**File:** `src/components/studio-v3/GuestDetailsStep.tsx:467`.

Change `tracking-[0.22em]` to `tracking-[0.12em]` on that line AND shorten to `Secure checkout · Final price shown at payment`. Also add `whitespace-nowrap` off + `flex-wrap` on the container so the line can wrap on 360 px.

**Regression test:** extend `e2e/studio-v3-reveal-and-guest-details-mobile.spec.ts`. On mobile, at the Guest Details phase, assert the footer microcopy `element.scrollWidth <= element.clientWidth + 1` AND `innerText` does not contain `…` / `\u2026`.

---

## Cross-cutting scaffolding (shared by tests above)

- Extend `e2e/studio-v3-walk-to-reveal.ts` with a `walkToStorytelling(page)` helper that stops one beat before Guest Details, so tests #1 and #4 share setup.
- Register a Playwright console listener helper `expectNoFontFallback(page)` that fails the test if any `[font-fallback]` warning fires during the walk. Reused by test #2 and can be added to the existing walk-to-reveal spec.
- All new specs go under the existing `mobile-chromium` project in `playwright.config.ts` (393×588, `deviceScaleFactor: 3`), matching the audit's viewport.

## CI wiring

Add a single new workflow `.github/workflows/studio-v3-p0-regression.yml` that runs the four new/extended specs on every PR + push to main, uploads failed diffs to `test-results/`, and uses `studio-v3-p0-${{ github.ref }}` concurrency with cancel-in-progress. Same shape as `.github/workflows/studio-v3-your-additions-visual.yml`.

## Out of scope for this plan

- P1/P2 items (stepper vocabulary, hydration mismatch, WhatsApp bubble hiding, phase reordering, Refine silhouette upgrade). Each becomes its own plan after P0 lands.
- Pricing data, add-on catalog, tour content — untouched.
- Desktop / tablet — mobile only.

## Deliverable per finding

Each finding ships as a single logical change: the code fix + its regression test + (for #3 only) the CI wiring update. I will verify each fix with the Playwright walker on mobile before marking it done.
