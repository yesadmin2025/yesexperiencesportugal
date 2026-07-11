
# Studio V3 — P1 Implementation Plan (Trust & Clarity)

P0 blockers shipped (storytelling reveal, typography cleanup, live route map, guest-details footer). This plan tackles the P1 backlog from `.lovable/studio-v3-audit.md` — trust, clarity, brand consistency, and hydration correctness. One PR-sized change per finding, each with a mobile regression test (393×588, `mobile-chromium`).

## Status snapshot (rolling)

- [x] #1 Stepper vocabulary (Feel/Shape/Time/Compose) + `beatIndexForPhase` mapping — shipped in `StudioV3ProgressStepper.tsx`. Stepper self-hides on intro (returns null) so early-mounting is a no-op; deferred until an audit shows a phase where it's actually missing.
- [x] #2 Stepper close-button overlap — `pr-12` reservation + `whitespace-nowrap` on labels, no `truncate`.
- [x] #3 Feeling grid — no pre-hover dim exists in `ChoiceGrid.tsx` (unselected tiles stay at opacity 1); rows share height via grid default `stretch`. Explicit Continue pill deferred — current auto-advance is intentional Studio pacing (see `mem://design/studio-philosophy.md`).
- [x] #4 Intro polish — curly `’` in H1, single meta line replaces three bordered pills, contrast solid on charcoal 92% ground.
- [x] #5 Refine → Storytelling CTA vocabulary — `CTA_MAKE_STORY` retired (kept as value-identical alias), `CTA_CONTINUE_TO_GUEST_DETAILS` used everywhere; Save moved to ghost pill peer beside primary Continue.
- [x] #6 SSR hydration — `useHydrated()` hook added; ripgrep sweep of `src/components/studio-v3` + `src/hooks` shows only one lazy `useState(() => …)` (LivingJourneyPanel) and it returns an SSR-safe default. No adopters needed today.
- [x] #7 Stripe.js single-load — `src/lib/stripe.ts` already module-level singleton; `BrandedCheckoutDrawer.tsx` uses a per-PK cache. No duplicate `loadStripe` sites remain.
- [x] #8 Hide global WhatsApp inside Studio V3 — `WhatsAppSupportButton.tsx` `HIDE_PATTERNS` gains `/studio-v3/`.

Regression coverage: `e2e/studio-v3-p1-audit-fixes-mobile.spec.ts` wired into `.github/workflows/studio-v3-p0-regression.yml`.

## 1. Stepper vocabulary + early mounting

**Files:** `src/components/studio-v3/StudioV3ProgressStepper.tsx`, `src/components/studio-v3/StudioV3.tsx` (mount site).

Rewrite the four stepper beats so they map 1:1 to real `data-phase` values instead of the current `Region → Rhythm → Dates → Compose` fiction. Proposed mapping:

```text
Beat 1 "Feel"     ← intro, feeling
Beat 2 "Shape"    ← who, pickup, interests
Beat 3 "Time"     ← rhythm, date
Beat 4 "Compose"  ← map, storyboard, refine, storytelling, guest-details
```

Mount the stepper from phase 2 onward (currently only appears at storyboard). Add a `currentBeatFromPhase(phase)` pure helper + unit test so the mapping stays honest.

**Regression test:** `e2e/studio-v3-p1-stepper-vocabulary-mobile.spec.ts` — walk every phase, assert stepper visible from `feeling` onward and the active beat label matches the mapping table above.

## 2. Stepper close-button overlap (`COMPO…` truncation)

**File:** `StudioV3ProgressStepper.tsx` (nav container) + wherever the close (X) mounts in `StudioV3.tsx`.

Reserve right-hand hit-area for the close button: `pr-12` on the stepper nav, or move the close button to `top: -32px right: 8px` above the nav row. Kill the `truncate` on beat labels; use `text-[10.5px]` with `whitespace-nowrap` and let the reserved padding do the work.

**Regression test:** extend the stepper spec above to assert no beat label contains `…` / `\u2026` and `scrollWidth <= clientWidth + 1` at 393 px.

## 3. Feeling grid — kill hover-dim, row-linked min-height, explicit Continue

**File:** `src/components/studio-v3/ChoiceGrid.tsx`.

- Detect coarse pointers (`window.matchMedia('(hover: none)')`) and skip the pre-hover dim state on touch — all tiles paint at full contrast until an actual selection lands.
- Wrap rows with `items-stretch` + `min-h` per tile so `Culture & heritage` (2-line label) doesn't stagger against `Adventure` (1-line).
- After the first selection, reveal a subtle `Continue` pill using the existing `[data-phase-cta="continue"]` primitive so users see the mechanism instead of the phase silently advancing.

**Regression test:** `e2e/studio-v3-p1-feeling-grid-mobile.spec.ts` — on load, assert all six tiles at full opacity (>=0.95); after selecting one, assert `[data-phase-cta="continue"]` visible and row bounding boxes share the same height.

## 4. Intro polish — H1 contrast, chip collapse, curly apostrophe

**File:** `src/components/studio-v3/StudioV3Intro.tsx`.

- H1 renders in `--ivory` when overlaying the dusk hero + add a bottom-to-top scrim (`linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)`) so text always clears 4.5:1.
- Replace the three full-width bordered pills (`Live route map`, `Drive-time checks`, `Region-aware moments`) with a single quiet inline meta line: `Live route map · Drive-time checks · Region-aware moments` (Inter 11px, tracking 0.22em, `--charcoal-soft`).
- Replace straight apostrophe in H1 with `’` (U+2019).

**Regression test:** `e2e/studio-v3-p1-intro-mobile.spec.ts` — assert H1 contrast ratio ≥ 4.5:1 via computed styles + screenshot, meta line is a single `<p>` not three `<button>`s, H1 innerText contains `’` not `'`.

## 5. Refine → Storytelling CTA vocabulary alignment

**Files:** `src/content/signature-day-copy.ts`, `src/components/studio-v3/FinalRevealStory.tsx`, `src/components/studio-v3/GuestDetailsStep.tsx` (destination-matching contract test).

Canonical labels:

- Refine primary → **"See my signature story"** (already exists; verify).
- Storytelling primary → **"Continue to guest details"** (`CTA_CONTINUE_TO_GUEST_DETAILS`, already the const value; retire `CTA_MAKE_STORY` alias so the same string never appears on Refine).
- Guest details primary → **"Continue to summary"** (verify).

Move `Save my signature` from a right-aligned gold underline into a ghost button beside the primary pill (`flex gap-3`, same pill shape family, tertiary underline colour).

**Regression test:** extend `e2e/studio-v3-cta-labels-live.spec.ts` — walk each transition and assert the label on the primary CTA matches the table above per phase.

## 6. SSR hydration mismatch

**Files:** bisect Studio V3 tree; likely suspects `StudioV3.tsx`, `useStudioState.ts`, `useStudioLocale.ts`, `useStudioVariant.ts`.

Add a shared `useHydrated()` hook (`src/hooks/use-hydrated.ts`) returning `false` on SSR and `true` after `useEffect` mounts. Grep for `useState(() => window…)` / `useState(() => localStorage…)` / `useState(() => document…)` under `src/components/studio-v3/**` and `src/hooks/useStudio*` and gate each behind `useHydrated()` (return SSR-safe default on first paint, real value after hydration).

**Regression test:** `e2e/studio-v3-p1-no-hydration-warning-mobile.spec.ts` — attach console listener before navigation; walk intro → guest-details; assert zero `hydrated but some attributes` warnings.

## 7. Stripe.js single-load + preload warning triage

**Files:** find current Stripe loader mount site (likely `src/routes/__root.tsx` or a checkout step); `src/routes/__root.tsx` for `<link rel=preload>` tags.

- Move `loadStripe` to a module-level singleton (`src/lib/stripe-client.ts`) and reuse across all checkout components — no per-step call to `loadStripe`.
- Audit `<link rel=preload as="…">` in root head + any scene clip preloads; remove `as="video"` / `as="fetch"` variants that browsers reject.

**Regression test:** extend `e2e/studio-v3-p1-no-hydration-warning-mobile.spec.ts` console listener to also assert zero `Stripe.js was loaded more than one time` and zero `unsupported \`as\` value` warnings.

## 8. Hide global WhatsApp bubble inside Studio V3

**File:** the global WhatsApp bubble component (grep for `whatsapp` under `src/components/**`).

Add `document.querySelector('[data-studio-v3-root]')` guard: if present, return `null`. Studio's "Ask a curator for help" secondary CTA (`CTA_ASK_CURATOR`) already covers the same intent inside the funnel.

**Regression test:** extend `e2e/studio-v3-p0-storytelling-reveal-mobile.spec.ts` to assert `[aria-label*="WhatsApp" i]` count === 0 at every phase.

---

## Cross-cutting scaffolding

- New shared helper `e2e/studio-v3-console-guards.ts` exporting `expectNoHydrationWarning(page)`, `expectNoStripeDoubleLoad(page)`, `expectNoPreloadAsWarning(page)`. Reused by tests #6 and #7.
- Extend `walkToReveal` with a `walkPhaseByPhase(page)` generator so tests #1 and #4 can pause at every phase to assert stepper state without duplicating the walker.

## CI wiring

Extend `.github/workflows/studio-v3-p0-regression.yml` (or a new sibling `studio-v3-p1-regression.yml`) to run the four new/extended specs on every PR + push to `main`, same `mobile-chromium` project, same failed-diffs artifact pattern.

## Out of scope for P1

- P2 items (phase reordering, refine silhouette upgrade to Mapbox static, price parity re-audit, guest-details scroll-reset, uppercase-tracking sweep) — each gets its own plan after P1 lands.
- Desktop / tablet — mobile-first only.
- Pricing data, add-on catalog, tour content — untouched.

## Deliverable per finding

Each finding ships as a single logical change: code fix + regression test. I will verify each fix with the Playwright walker on mobile before marking it done, and reconcile `.lovable/plan.md` at the end.
