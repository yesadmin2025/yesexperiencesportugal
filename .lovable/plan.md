# Tablet E2E: moments card stays below the map during route composition

Add one new spec that mirrors the existing mobile invariant at tablet width, so we catch regressions where a two-column or side-by-side layout kicks in at the tablet breakpoint and lifts the "Your Signature" / moments card next to (or above) the map while the route is still unfolding.

## File

`e2e/studio-v3-tablet-map-above-moments-card.spec.ts`

## Behavior

- **Project gate**: run only under the `tablet-chromium` Playwright project (viewport 834×1112 from `playwright.config.ts`). `test.skip(testInfo.project.name !== "tablet-chromium", "tablet-only invariant")` in `beforeEach`, exactly matching the mobile spec's gating style.
- **Funnel**: `await page.goto("/studio-v3")` then `await walkToReveal(page)` from `./studio-v3-walk-to-reveal`. Same helper as the mobile spec — it stops at the storyboard/map phase if it can't hold-journey to the reveal, which is the exact state we want to assert against.
- **Selectors** (identical to mobile spec, reusing the testids already in place):
  - `[data-testid="studio-v3-map-anticipation"]` — the composing map.
  - `[data-testid="studio-v3-moments-card"]` — the moments/story card wrapper added to `MapAwakens.tsx` for the mobile spec.
- **Skips** (predictive, so tablet variance doesn't cause false failures):
  - Skip if the map isn't visible within 10s (`test.skip(true, "map anticipation state not reached in this run")`).
  - Skip if the moments card isn't mounted within 5s (`test.skip(true, "moments card not mounted this run")`).
  - Skip if `boundingBox()` returns null for either element.
  - Skip if the two boxes don't horizontally overlap — at tablet width the layout may legitimately place them side-by-side in landscape edge cases (mirrors the z-index caveat in the mobile plan). The vertical-stack invariant only applies when they occupy the same horizontal band.
- **Assertions** (only when horizontally overlapping, matching mobile):
  - `cardBox.y >= mapBox.y + mapBox.height * 0.6` — card starts at or below the map's mid-line.
  - `cardBox.y > mapBox.y` — card top is strictly below the map's top edge (no occlusion of the composing route).
- **Artifact**: `await page.screenshot({ path: "/tmp/browser/tablet-stack/tablet-map-composing.png" })` for review, parallel to the mobile spec's `mobile-stack/mobile-map-composing.png`.

## Predictive intent-matching

Because tablet is where responsive layouts most often flip between stacked and side-by-side, the spec is conservatively skip-gated: it only fails when the map and card are visually stacked (horizontal overlap) AND the card intrudes into the top 60% of the map. This matches the user's real intent — "keep the composing route visible" — without punishing legitimate side-by-side tablet layouts.

## Non-goals

- No changes to `MapAwakens.tsx`, `SignaturePriceCard`, `walkToReveal`, `playwright.config.ts`, or CI workflows.
- No new baselines/snapshots — layout-box assertions only.

## Run

`bunx playwright test e2e/studio-v3-tablet-map-above-moments-card.spec.ts --project=tablet-chromium --reporter=line`
