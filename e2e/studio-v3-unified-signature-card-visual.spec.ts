// Visual regression — the unified "Your Signature" card must stay stable
// when its collapsible sections (Swap pool, Add-a-moment pool) expand and
// re-collapse. Companion to `studio-v3-unified-signature-card.spec.ts`
// which asserts the numeric-total invariants for the same interactions.
//
// First run generates baselines under e2e/__baselines__/; the pixel-diff
// budget lives in playwright.config.ts (maxDiffPixelRatio: 0.002).

import { expect, test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

const REVEAL = '[data-testid="studio-v3-reveal"]';
const CARD = '[data-testid="studio-v3-signature-card"]';

test.describe("Studio V3 — Signature card visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/studio-v3");
    await walkToReveal(page);
  });

  test("card is stable through expand/collapse of Swap and Add-moment pools", async ({ page }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();
    await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(300);

    await expect(card).toHaveScreenshot("signature-card-collapsed.png");

    // Swap pool cycle.
    const swap = card.locator('button[aria-label^="Swap "]').first();
    if (await swap.isVisible().catch(() => false)) {
      await swap.scrollIntoViewIfNeeded().catch(() => undefined);
      await swap.click();
      await expect(card.locator('[data-testid="studio-v3-swap-pool"]').first()).toBeVisible();
      await page.waitForTimeout(250);
      await expect(card).toHaveScreenshot("signature-card-swap-expanded.png");

      await swap.click();
      await expect(card.locator('[data-testid="studio-v3-swap-pool"]')).toHaveCount(0);
      await page.waitForTimeout(250);
      await expect(card).toHaveScreenshot("signature-card-after-swap-collapse.png");
    }

    // Add-moment pool cycle.
    const addMoment = card
      .locator('[data-testid="studio-v3-add-moment"] button[aria-expanded]')
      .first();
    if (await addMoment.isVisible().catch(() => false)) {
      await addMoment.scrollIntoViewIfNeeded().catch(() => undefined);
      await addMoment.click();
      await expect(card.locator('[data-testid="studio-v3-add-pool"]').first()).toBeVisible();
      await page.waitForTimeout(250);
      await expect(card).toHaveScreenshot("signature-card-add-pool-expanded.png");

      await addMoment.click();
      await expect(card.locator('[data-testid="studio-v3-add-pool"]')).toHaveCount(0);
      await page.waitForTimeout(250);
      await expect(card).toHaveScreenshot("signature-card-after-add-collapse.png");
    }
  });
});
