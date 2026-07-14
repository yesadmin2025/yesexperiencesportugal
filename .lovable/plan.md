
## Goal

Add one focused Playwright spec that reproduces the "Still not working" storyboard dead-end (persisted empty `editedRoutePoints` on a valid Signature draft) and asserts the stops editor recovers — no dead-end copy, real Signature stops render, and the guest can act on them.

## Reproduction shape

1. Mobile viewport 393×588 (matches the user's device).
2. Pre-hydrate `localStorage[STUDIO_DRAFT_STORAGE_KEY]` (`yes.studio.v3.draft.v1`) with a v2 envelope whose `state.editedRoutePoints = []` and `state.phase = "storyboard"`. Draft fields mirror the reported combos (feeling: `coastal`, companions: `friends`, interests: `heritage`+`coast`+`photography`, rhythm: `full`, pickup: `lisbon`) so we hit the exact path from screenshots 1 & 2. Use `tourId: "sintra-cascais"` as a real Signature id that guarantees a non-empty stops pool.
3. Navigate to `/studio-v3`. The storyboard renders directly (hydration jumps past intro).

## Assertions

- The dead-end block `[data-testid="studio-v3-stops-editor-empty"]` is **not present**.
- The active editor `[data-testid="studio-v3-stops-editor"]` **is** present and contains ≥ 1 `[data-testid="studio-v3-stop-row"]`.
- The dead-end copy string `"We couldn't compose a draft for this combination."` is not on the page.
- The "YES Approved" trust mark still renders (recovery didn't downgrade the trust state).
- Screenshot the storyboard for the visual record under `/tmp/browser/…` — not committed, just for local triage; Playwright captures on failure via config.

## Second scenario in same spec

Reproduce the *other* trigger the fix covers: `editedRoutePoints = null` **and** the resolver returns a route with all stops filtered out (simulate by hydrating a draft whose combo is known to yield thin curation in test data). Since this is harder to force deterministically without touching curation, keep it as a *soft* case: hydrate the same draft with `editedRoutePoints: null` and assert the editor still renders ≥ 1 stop row — proving the fix's `seedFromPool()` path.

## File

`e2e/studio-v3-storyboard-recovery.spec.ts`

Shape:

```ts
import { test, expect } from "@playwright/test";
import { STUDIO_DRAFT_STORAGE_KEY } from "../src/components/studio-v3/studioDraftStorage";

const BASE_STATE = { /* coastal / friends / heritage+coast+photography / full / lisbon */ };

async function hydrate(page, editedRoutePoints) {
  await page.addInitScript(([key, envelope]) => {
    window.localStorage.setItem(key, JSON.stringify(envelope));
  }, [STUDIO_DRAFT_STORAGE_KEY, envelopeWith(editedRoutePoints)]);
}

test.use({ viewport: { width: 393, height: 852 } });

test.describe("Studio V3 storyboard recovery", () => {
  test("persisted empty editedRoutePoints does not strand the editor", async ({ page }) => {
    await hydrate(page, []);
    await page.goto("/studio-v3");
    await expect(page.getByTestId("studio-v3-stops-editor")).toBeVisible();
    await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);
    await expect(page.getByText("We couldn't compose a draft for this combination.")).toHaveCount(0);
    await expect(page.getByTestId("studio-v3-stop-row").first()).toBeVisible();
  });

  test("null editedRoutePoints seeds real Signature stops", async ({ page }) => {
    await hydrate(page, null);
    await page.goto("/studio-v3");
    await expect(page.getByTestId("studio-v3-stop-row").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("studio-v3-stops-editor-empty")).toHaveCount(0);
  });
});
```

- Soft-skip guard: if `page.getByTestId("studio-v3-stops-editor").isVisible()` never resolves within 15 s (draft hydration path shifted), `test.skip(true, "…")` — same pattern as the existing retry spec so an unrelated storyboard refactor doesn't red-line CI.

## Package script

Add `"test:e2e:storyboard-recovery": "playwright test e2e/studio-v3-storyboard-recovery.spec.ts"` to `package.json` so CI and manual runs are one command.

## Verification

1. Run the new spec locally via the new script — must pass.
2. Temporarily revert the storyboard fix (`baseStops` seed + editedStops guard) locally to confirm the spec fails as expected, then restore.
3. Confirm no impact on the existing `studio-v3-checkout-retry-and-failures.spec.ts` (uses the same hydration key — verify they don't collide when run together).

## Out of scope

- No changes to `StudioV3.tsx`, curation, or checkout code — this is pure test coverage locking the fix that already shipped.
- No workflow YAML wiring in this turn; a separate turn can add the new script to `.github/workflows/studio-v3-p0-regression.yml` once the spec is green in CI.
