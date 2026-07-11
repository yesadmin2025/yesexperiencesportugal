## Goal
Extend Playwright coverage for the Refine → Storytelling flow on mobile (393×588) with three additions: (1) round-trip ordering/styling assertion for add-ons under "— Your additions", (2) navigation contract for the three primary CTAs, and (3) a11y validation for reveal CTAs and add-on controls.

## Scope
Tests only. No product code changes. All new specs run against the sandbox dev server via `playwright.local.config.ts` and reuse `walkToReveal` + the local `advanceRefineToStorytelling` helper pattern.

## Changes

### 1. Extend `e2e/studio-v3-unified-signature-card.spec.ts`
Add a new test: **"— Your additions round-trip ordering & styling"**.
- Read the full list of add-on toggle testids in the Refine screen.
- Toggle ON add-on A, then B, then C in that order → assert the `[data-studio-v3-your-additions] li` sequence matches the toggle order (DOM order = tap order), each row shows `+€N` in gold, uppercase divider "— Your additions" retains `uppercase`, `font-semibold`, `tracking-[0.22em]`, and gold token color.
- Toggle OFF B → assert only A, C remain, still in original relative order, divider still present.
- Toggle OFF A and C → assert divider is removed and `Included in your day` returns to its baseline list only.
- Assert `Included in your day` items never re-order during any of the above.

### 2. New spec `e2e/studio-v3-cta-navigation-mobile.spec.ts` (viewport 393×588)
Verifies the three CTA transitions:
- **"See my signature story" (Refine → Storytelling)** — from Refine screen, click primary CTA, assert `data-studio-v3-screen="storytelling"` visible and `studio-v3-final-reveal` present; Refine root no longer in DOM.
- **"Continue to guest details" (Storytelling → Guest Details)** — click `studio-v3-final-reveal-continue`, assert the email field (`getByLabel(/email/i)`) is visible and `studio-v3-guest-details` testid mounts.
- **"Save my signature" (Storytelling side-effect, stays on screen)** — click `studio-v3-final-reveal-save`, assert toast/confirmation surface appears and screen remains Storytelling (no route change, `studio-v3-final-reveal` still visible).
- **"Back to refine" (Storytelling → Refine)** — locate the back control on Storytelling, click, assert `data-studio-v3-screen="refine"` returns, previously-selected add-ons are still toggled ON (state preserved through the round-trip).

Uses existing `walkToReveal` + `advanceRefineToStorytelling` helper (extract helper into shared `e2e/studio-v3-walk-to-reveal.ts` so both specs import it — one-line addition, no behavior change).

### 3. New spec `e2e/studio-v3-reveal-a11y-mobile.spec.ts` (viewport 393×588)
A11y-focused assertions on Refine + Storytelling:
- **Labels**: every add-on toggle has an accessible name (via `aria-label` or associated `<label>`); each reveal CTA (`Continue to guest details`, `Save my signature`, `Back to refine`) has a non-empty accessible name matching visible text.
- **Focus order**: on Refine, press `Tab` repeatedly from the top of `[data-studio-v3-screen="refine"]` and record `document.activeElement` testids/labels; assert order = add-on toggles (in DOM order) → primary CTA → ghost curator CTA. On Storytelling, assert order = Back to refine → Continue to guest details → Save my signature.
- **Keyboard interaction**: focus first add-on toggle, press `Space` → assert its `aria-pressed`/`aria-checked` flips and `— Your additions` row appears; press `Space` again → row removed. Focus primary "See my signature story" and press `Enter` → screen advances to Storytelling.
- **Focus visibility**: after Tab lands on each CTA, assert `:focus-visible` styles resolve to a non-transparent outline (computed `outline-width > 0` OR box-shadow ring), so keyboard users see the focus ring.
- Run `@axe-core/playwright` scan scoped to `[data-studio-v3-screen="refine"]` and `[data-studio-v3-final-reveal]`; fail on `serious`/`critical` violations only (excluding color-contrast for now to avoid noise — brand palette contrast is covered elsewhere).

### 4. Small helper extraction
Move `advanceRefineToStorytelling` from `studio-v3-reveal-and-guest-details-mobile.spec.ts` into `e2e/studio-v3-walk-to-reveal.ts` as a named export so the three specs (existing mobile reveal + two new ones) share one implementation.

## Dependencies
- `@axe-core/playwright` — add via `bun add -D @axe-core/playwright` if not already present (check `package.json` at build time; if present, skip).

## Non-goals
- No product code changes.
- No new baselines beyond what already exists.
- No changes to visual snapshot spec.
- No CI workflow additions (local run only, matching the existing mobile reveal spec pattern).

## How to run locally
```
bunx playwright test --config=playwright.local.config.ts \
  studio-v3-unified-signature-card \
  studio-v3-cta-navigation-mobile \
  studio-v3-reveal-a11y-mobile
```
