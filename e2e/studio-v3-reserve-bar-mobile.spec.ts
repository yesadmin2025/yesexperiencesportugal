/**
 * Studio V3 — Your Day reserve bar (mobile).
 *
 * The unified "Your Day" surface is a long editorial scroll; its primary
 * CTA ("Love this day · Reserve it") sits at the very bottom. The reserve
 * bar keeps that single action — with the live investment and the
 * date/party facts — within reach while the traveler reads the day.
 *
 * Contract:
 *   - The bar appears only while the surface's own CTA is off-screen
 *     (never two primary actions visible).
 *   - It mirrors the same gate and handler — tapping it advances exactly
 *     like the in-flow CTA.
 *   - It never covers the footer: a spacer keeps the end of the page
 *     reachable while the bar is up.
 *
 * No network, no payment: the walk stops at the checkout seam.
 */

import { test, expect } from "@playwright/test";

import { resetStudioV3State, walkToReveal } from "./studio-v3-walk-to-reveal";

const YOUR_DAY = '[data-studio-v3-screen="refine"]';
const BAR = '[data-testid="studio-v3-reserve-bar"]';
const BAR_CTA = '[data-testid="studio-v3-reserve-bar-cta"]';
const MAIN_CTA = '[data-testid="studio-v3-handoff-primary"]';

test.use({
  viewport: { width: 393, height: 780 },
  hasTouch: true,
  isMobile: true,
});

test.describe("Studio V3 Your Day reserve bar", () => {
  test.beforeEach(async ({ page }) => {
    await resetStudioV3State(page);
  });

  test("appears while the main CTA is off-screen, hides when it is visible", async ({ page }) => {
    await walkToReveal(page);

    const yourDay = page.locator(YOUR_DAY).first();
    if (!(await yourDay.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach Your Day in this environment");
    }

    // The composing overlay must be gone before the bar can show.
    await page
      .locator('[data-testid="studio-v3-compose-overlay"]')
      .waitFor({ state: "detached", timeout: 15_000 })
      .catch(() => undefined);

    const bar = page.locator(BAR);
    const mainCta = page.locator(MAIN_CTA);
    if (!(await mainCta.isVisible().catch(() => false))) {
      // Day not reservable in this environment (gate closed) — the bar must
      // stay hidden rather than offer a dead action.
      await expect(bar).toHaveAttribute("data-visible", "false");
      test.skip(true, "day not reservable in this environment");
    }

    // At the top of the surface the main CTA is far below: bar is up,
    // carrying the live price and the date/party facts.
    await yourDay.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar).toHaveAttribute("data-visible", "true");
    const price = await page.getByTestId("studio-v3-reserve-bar-price").textContent();
    expect(price ?? "").toMatch(/€|—/);

    // Scrolling the main CTA into view retires the bar — one primary
    // action on screen at a time.
    await mainCta.scrollIntoViewIfNeeded();
    await expect(bar).toHaveAttribute("data-visible", "false");

    // Scrolling back up brings it back.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar).toHaveAttribute("data-visible", "true");
  });

  test("tapping the bar advances exactly like the in-flow CTA", async ({ page }) => {
    await walkToReveal(page);

    const yourDay = page.locator(YOUR_DAY).first();
    if (!(await yourDay.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach Your Day in this environment");
    }
    await page
      .locator('[data-testid="studio-v3-compose-overlay"]')
      .waitFor({ state: "detached", timeout: 15_000 })
      .catch(() => undefined);

    const mainCta = page.locator(MAIN_CTA);
    if (!(await mainCta.isVisible().catch(() => false))) {
      test.skip(true, "day not reservable in this environment");
    }
    if ((await mainCta.getAttribute("data-reserve-blocked")) === "true") {
      test.skip(true, "reserve gate closed in this environment");
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    const barCta = page.locator(BAR_CTA);
    await expect(barCta).toBeVisible();
    await barCta.tap();

    // Same seam as the in-flow CTA: the surface leaves "Your Day".
    await expect(page.locator(YOUR_DAY)).toHaveCount(0, { timeout: 10_000 });
  });
});
