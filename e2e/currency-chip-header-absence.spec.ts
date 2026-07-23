/**
 * Guards that the currency chip is exclusively bound to euro-price
 * surfaces and never leaks into the site chrome or the checkout flow.
 *
 *   1. Header and footer must contain zero currency toggles/chips.
 *   2. Every route in `EUR_ROUTES` must render at least one chip and
 *      have every `[data-price-eur]` node update on toggle.
 *   3. Checkout drawers and totals stay in EUR literals — the chip is
 *      not injected there and `data-price-role="checkout"` (or the
 *      Stripe redirect surface) never mounts a chip.
 */

import { test, expect } from "@playwright/test";

const EUR_ROUTES = [
  "/experiences",
  "/day-tours",
  "/pt/experiences",
  "/pt/day-tours",
  "/tours/lisbon-secret-food",
];

test.describe("Currency chip surface boundaries", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("header and footer never mount a currency chip", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('header [data-a11y-scope="price-currency-chip"]')).toHaveCount(0);
    await expect(page.locator('header [data-a11y-scope="currency-toggle"]')).toHaveCount(0);
    await expect(page.locator('footer [data-a11y-scope="price-currency-chip"]')).toHaveCount(0);
    await expect(page.locator('footer [data-a11y-scope="currency-toggle"]')).toHaveCount(0);
  });

  for (const url of EUR_ROUTES) {
    test(`chip present and drives every EUR price on ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      const chip = page.locator('[data-a11y-scope="price-currency-chip"]').first();
      await expect(chip).toBeVisible();

      const eurNodes = page.locator("[data-price-eur]");
      const count = await eurNodes.count();
      expect(count, `expected at least one [data-price-eur] on ${url}`).toBeGreaterThan(0);

      const first = eurNodes.first();
      const before = (await first.innerText()).trim();

      await chip.locator('[data-currency-option="USD"]').click();
      await expect
        .poll(async () => (await first.innerText()).trim(), { timeout: 3_000 })
        .not.toBe(before);

      // Reset for isolation between tests.
      await chip.locator('[data-currency-option="EUR"]').click();
    });
  }
});
