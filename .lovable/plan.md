# Studio V3 — 4 new E2E specs

All four specs live in `e2e/`, reuse `walkToReveal` + parsers from `e2e/studio-v3-walk-to-reveal.ts`, `test.skip(...)` when the funnel doesn't reach the reveal, and follow the existing spec conventions (Playwright, mobile-chromium project by default).

## 1. `e2e/studio-v3-unified-signature-card-visual.spec.ts`
Visual regression of the unified `[data-testid="studio-v3-signature-card"]`.

- Walk to reveal, `expect(card).toBeVisible()`.
- `await card.evaluate(el => el.scrollIntoView({block: 'start'}))`, disable animations via `page.emulateMedia({ reducedMotion: 'reduce' })` before navigation.
- `await expect(card).toHaveScreenshot('signature-card-collapsed.png')`.
- Expand Swap pool (`button[aria-label^="Swap "]`) if present, wait for `[data-testid="studio-v3-swap-pool"]` visible, snapshot `signature-card-swap-expanded.png`, then click to collapse and snapshot `signature-card-after-collapse.png` (asserts no lingering layout shift).
- Same cycle for `[data-testid="studio-v3-add-moment"] button[aria-expanded]` → `signature-card-add-pool-expanded.png`.
- Snapshots go under `e2e/__baselines__/` via Playwright's default `toHaveScreenshot`. First run generates baselines; CI diff budget already configured in `playwright.config.ts` (0.2% pixel ratio).

## 2. `e2e/studio-v3-add-ons-disabled-vs-enabled.spec.ts`
Companion to the existing `studio-v3-add-ons-disabled-never-affect-total.spec.ts` — this new one asserts the *contrast*: disabled do nothing, enabled always do.

- Baseline `parseAddOnsTotalEur` + `parsePartyTotalEur`.
- Force-click every `button[data-addon-id][data-state="disabled"]` and every `button[data-addon-id][aria-disabled="true"]`. After each click, assert both totals equal baseline and `aria-pressed="false"`.
- Then iterate `readInteractableAddons(page)` (up to first 3 to respect cap): each click MUST strictly increase both totals by that chip's `+€N` (per-guest × guest count for party-total); each un-click MUST restore exactly the previous value.
- Ends with a full toggle-off returning to baseline.

## 3. `e2e/studio-v3-cta-labels-live.spec.ts`
Every add-on toggle updates the visible label of both the inline CTA (`[data-testid="studio-v3-cta-primary"]`) and the mobile sticky CTA (`[data-testid="studio-v3-cta-sticky"]`).

- Regex `/€\s?(\d+)/` on `textContent` of each CTA.
- Baseline both labels; assert equal to `parsePartyTotalEur` (or `€NN /pp` fallback when party-total is null).
- Toggle first two interactable add-ons: after each click read CTA text within the same frame using `page.evaluate` (mirrors `studio-v3-add-ons-same-frame.spec.ts` pattern) and assert the numeric in each CTA equals the new `party-total`.
- Scroll to reveal sticky CTA (scroll `SignaturePriceCard` past viewport) and re-assert its label after another toggle.
- Toggle back off, assert labels return to baseline text.

## 4. `e2e/studio-v3-mobile-map-above-moments-card.spec.ts`
Mobile-only (project `mobile-chromium` via `test.use({ viewport: { width: 393, height: 852 } })` + skip on non-mobile projects).

Verifies that while the route is unfolding — i.e. `[data-testid="studio-v3-map-anticipation"]` is mounted and the reveal has NOT appeared yet — the moments/story card is BELOW (later in the vertical stack, higher `top`) than the map on mobile, so the user can watch the map compose.

- Walk the funnel up to the storyboard/map phase but do NOT hold-journey to the reveal.
- Wait for `[data-testid="studio-v3-map-anticipation"]` visible.
- Locate the moments card container — the closest ancestor of `[data-testid="studio-v3-moment-timings"]` that isn't the map wrapper (query the panel by data attribute; if none exists, add `data-testid="studio-v3-moments-card"` on that wrapper in `MapAwakens.tsx` in the build step).
- `boundingBox()` for both: assert `moments.y >= map.y + map.height * 0.6` (moments start clearly below the map's mid-line) AND `moments.y > map.y` (no overlap where the card would occlude the composing route).
- Also assert z-index sanity: `getComputedStyle(moments).zIndex` is not greater than the map's when they visually overlap in landscape edge cases → skip if boxes don't overlap horizontally.
- Screenshot `mobile-map-composing.png` to `/tmp/browser/mobile-stack/` for artifact review.

## Technical notes

- All specs assume `walkToReveal` already covers the intro→reveal walk; no funnel changes.
- Spec #4 may require a one-line addition of `data-testid="studio-v3-moments-card"` on the moments panel wrapper in `src/components/studio-v3/MapAwakens.tsx` (only if no existing stable selector exists after re-reading the file); this is a test-only attribute, no visual/behavioral change.
- No changes to `SignaturePriceCard`, `StudioV3.tsx`, `playwright.config.ts`, or CI workflows.
- Run locally: `bunx playwright test e2e/studio-v3-unified-signature-card-visual.spec.ts e2e/studio-v3-add-ons-disabled-vs-enabled.spec.ts e2e/studio-v3-cta-labels-live.spec.ts e2e/studio-v3-mobile-map-above-moments-card.spec.ts --reporter=line`.
- Visual baselines will be generated on first successful run via `--update-snapshots`.

## Non-goals

- No changes to add-on pricing logic, CTA copy, or reveal layout.
- No new CI workflow file — these run under the existing Playwright job.
- No refactor of `walkToReveal` or shared helpers beyond what's already exported.
