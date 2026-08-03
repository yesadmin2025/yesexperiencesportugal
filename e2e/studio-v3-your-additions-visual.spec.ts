/**
 * Studio V3 · "— Your additions" visual regression @ 393×588 mobile.
 *
 * Element-scoped screenshot baselines for the inclusions footnote so any
 * regression in spacing, the "— Your additions" divider, gold bullets, or
 * the price cell typography gets caught before shipping.
 *
 * Three baselines:
 *   1. `additions-empty` — footnote with only `Included in your day` rows,
 *      no add-ons toggled. Locks base spacing + divider ABSENCE.
 *   2. `additions-one`   — one add-on toggled ON. Locks divider styling,
 *      gold bullet, and single-row layout.
 *   3. `additions-multi` — up to three add-ons toggled ON. Locks vertical
 *      rhythm across multiple rows + catalog-order stacking.
 *
 * First run: seed with `--update-snapshots`.
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-your-additions-visual
 */

import { expect, test, type Page } from "@playwright/test";
import { readInteractableAddons, walkToReveal } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 588 } as const;
const FOOTNOTE = '[data-testid="studio-v3-inclusions-footnote"]';

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const images = Array.from(document.images);
    await Promise.all(
      images.map((image) =>
        image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
      ),
    );
  });
  await page.waitForTimeout(300);
}

async function reachRefineWithFootnote(page: Page): Promise<boolean> {
  await page.goto("/studio-v3");
  await walkToReveal(page);
  const refine = page.locator('[data-studio-v3-screen="refine"]').first();
  if (!(await refine.isVisible().catch(() => false))) return false;
  const footnote = page.locator(FOOTNOTE).first();
  return footnote.isVisible().catch(() => false);
}

async function toggleAddon(page: Page, id: string): Promise<void> {
  const button = page
    .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${id}"]`)
    .first();
  await button.scrollIntoViewIfNeeded().catch(() => undefined);
  await button.click();
}

test.describe("Studio V3 · Your additions visual @ 393×588", () => {
  test.use({ viewport: VIEWPORT });

  test("footnote baselines: empty, one add-on, and multiple add-ons", async ({ page }) => {
    test.setTimeout(60_000);

    if (!(await reachRefineWithFootnote(page))) {
      test.skip(true, "funnel did not reach Refine with a visible footnote");
    }
    const addons = await readInteractableAddons(page);
    test.skip(addons.length === 0, "no interactable add-ons available");

    const footnote = page.locator(FOOTNOTE).first();
    await footnote.scrollIntoViewIfNeeded().catch(() => undefined);
    await settle(page);

    // 1) Empty baseline — divider must be absent.
    expect(await footnote.getByText(/Your additions/).count()).toBe(0);
    await expect(footnote).toHaveScreenshot("additions-empty.png", {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });

    // 2) One add-on ON.
    await toggleAddon(page, addons[0].id);
    await expect(footnote.getByText(/Your additions/).first()).toBeVisible();
    await expect(footnote.locator('[data-testid="studio-v3-included-addon-row"]')).toHaveCount(1);
    await footnote.scrollIntoViewIfNeeded().catch(() => undefined);
    await settle(page);
    await expect(footnote).toHaveScreenshot("additions-one.png", {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });

    // 3) Up to three add-ons ON.
    const extras = addons.slice(1, 3);
    for (const addon of extras) await toggleAddon(page, addon.id);
    await expect(footnote.locator('[data-testid="studio-v3-included-addon-row"]')).toHaveCount(
      1 + extras.length,
    );
    await footnote.scrollIntoViewIfNeeded().catch(() => undefined);
    await settle(page);
    await expect(footnote).toHaveScreenshot("additions-multi.png", {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });
});
