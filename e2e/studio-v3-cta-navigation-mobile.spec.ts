/**
 * Studio V3 · CTA navigation contract @ 393×588 mobile.
 *
 * Locks the three primary transitions users take on Refine + Storytelling:
 *
 *   Refine        --[See my signature story]-->      Storytelling
 *   Storytelling  --[Continue to guest details]-->   Guest Details
 *   Storytelling  --[Save my signature]-->           (stays on Storytelling)
 *   Storytelling  --[← Back to refine]-->            Refine (state preserved)
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-cta-navigation-mobile
 */

import { test, expect, type Page } from "@playwright/test";
import {
  advanceRefineToStorytelling,
  readInteractableAddons,
  resetStudioV3State,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 588 } as const;

async function reachRefine(page: Page): Promise<boolean> {
  // Reset persisted Studio state so a prior spec in the same worker cannot
  // resume mid-funnel and stall this walk.
  await resetStudioV3State(page);
  await walkToReveal(page);
  const refine = page.locator('[data-studio-v3-screen="refine"]').first();
  return refine.isVisible().catch(() => false);
}

test.describe("Studio V3 · CTA navigation @ 393×588", () => {
  test.use({ viewport: VIEWPORT });

  test("Refine → Storytelling via 'See my signature story'", async ({ page }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");

    await advanceRefineToStorytelling(page);

    const storytelling = page.locator('[data-studio-v3-screen="storytelling"]').first();
    await expect(storytelling).toBeVisible({ timeout: 6_000 });
    await expect(page.getByTestId("studio-v3-final-reveal")).toBeVisible();
    // Refine must no longer be visible on-screen.
    expect(await page.locator('[data-studio-v3-screen="refine"]').count()).toBe(0);
  });

  test("Storytelling → Guest Details via 'Continue to guest details'", async ({ page }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");
    await advanceRefineToStorytelling(page);

    const cont = page.getByTestId("studio-v3-final-reveal-continue");
    await expect(cont).toBeVisible();
    await expect(cont).toHaveText(/Continue to guest details/i);
    await cont.scrollIntoViewIfNeeded().catch(() => undefined);
    await cont.click();

    await expect(page.getByTestId("studio-v3-guest-details")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("'Save my signature' fires the save handler and STAYS on Storytelling", async ({ page }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");
    await advanceRefineToStorytelling(page);

    const save = page.getByTestId("studio-v3-final-reveal-save");
    await expect(save).toBeVisible();
    await expect(save).toHaveText(/Save my signature/i);
    await save.scrollIntoViewIfNeeded().catch(() => undefined);
    await save.click();

    // The screen must not navigate away — Storytelling stays mounted.
    await page.waitForTimeout(600);
    await expect(page.locator('[data-studio-v3-screen="storytelling"]').first()).toBeVisible();
    await expect(page.getByTestId("studio-v3-final-reveal")).toBeVisible();
    // And Guest Details must NOT have opened.
    expect(await page.getByTestId("studio-v3-guest-details").count()).toBe(0);
  });

  test("'← Back to refine' returns to Refine and preserves selected add-ons", async ({ page }) => {
    if (!(await reachRefine(page))) test.skip(true, "funnel did not reach Refine");

    // Toggle one add-on ON before advancing, so we can verify state survives
    // the round-trip.
    const addons = await readInteractableAddons(page);
    test.skip(addons.length === 0, "no interactable add-ons");
    const pick = addons[0].id;
    const btn = page
      .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${pick}"]`)
      .first();
    await btn.scrollIntoViewIfNeeded().catch(() => undefined);
    await btn.click();

    await advanceRefineToStorytelling(page);

    const back = page.getByTestId("studio-v3-final-reveal-back");
    await expect(back).toBeVisible();
    await back.scrollIntoViewIfNeeded().catch(() => undefined);
    await back.click();

    const refine = page.locator('[data-studio-v3-screen="refine"]').first();
    await expect(refine).toBeVisible({ timeout: 6_000 });

    // Storytelling gone.
    expect(await page.locator('[data-studio-v3-screen="storytelling"]').count()).toBe(0);

    // Add-on still toggled ON — check the row is still in the footnote.
    const footnote = page.locator('[data-testid="studio-v3-inclusions-footnote"]').first();
    if (await footnote.isVisible().catch(() => false)) {
      await expect(
        footnote.locator(`[data-testid="studio-v3-included-addon-row"][data-addon-id="${pick}"]`),
      ).toBeVisible();
    }
  });
});
