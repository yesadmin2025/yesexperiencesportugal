/**
 * Axe-core a11y checks for the price-scoped switchers.
 *
 * The currency toggle is intentionally NOT in the header — it only
 * appears next to euro prices via `PriceCurrencyChip`. These specs
 * enforce:
 *   • header/footer scopes contain the LanguageSwitcher only.
 *   • every `PriceCurrencyChip` render carries an accessible group
 *     name and passes axe on ARIA, contrast, and focus rules.
 *   • the currency chip's roving `aria-pressed` reflects the active
 *     selection after click.
 */

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const AXE_RULES = [
  "color-contrast",
  "aria-allowed-attr",
  "aria-required-attr",
  "aria-valid-attr-value",
  "aria-valid-attr",
  "button-name",
  "link-name",
  "role-support-aria-attr",
  "focus-order-semantics",
];

async function scanScope(page: Page, selector: string) {
  await page.locator(selector).first().waitFor({ state: "visible" });
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(AXE_TAGS)
    .options({ runOnly: { type: "rule", values: AXE_RULES } })
    .analyze();
  return results.violations;
}

async function assertFocusVisible(page: Page, selector: string) {
  const first = page.locator(`${selector} a, ${selector} button`).first();
  await first.focus();
  const ring = await first.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    const outlineWidth = parseFloat(cs.outlineWidth || "0");
    const hasShadow = cs.boxShadow && cs.boxShadow !== "none";
    return { outlineWidth, hasShadow };
  });
  expect(ring.outlineWidth >= 2 || ring.hasShadow).toBeTruthy();
}

test.describe("Chrome switchers — language only (mobile 393×780)", () => {
  test.use({ viewport: { width: 393, height: 780 } });

  test("mobile header exposes LanguageSwitcher and no currency chip", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const lang = page.locator('header [data-a11y-scope="language-switcher"]').first();
    await expect(lang).toBeVisible();
    await expect(page.locator('header [data-a11y-scope="currency-toggle"]')).toHaveCount(0);
    await expect(page.locator('header [data-a11y-scope="price-currency-chip"]')).toHaveCount(0);

    const violations = await scanScope(page, 'header [data-a11y-scope="language-switcher"]');
    expect(violations, `axe violations: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
    await assertFocusVisible(page, 'header [data-a11y-scope="language-switcher"]');
  });

  test("footer exposes LanguageSwitcher and no currency chip", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();

    await expect(
      page.locator('footer [data-a11y-scope="language-switcher"]').first(),
    ).toBeVisible();
    await expect(page.locator('footer [data-a11y-scope="currency-toggle"]')).toHaveCount(0);
  });
});

test.describe("PriceCurrencyChip — axe + roving state", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  const priceSurfaces = ["/experiences", "/day-tours", "/pt/experiences", "/pt/day-tours"];

  for (const url of priceSurfaces) {
    test(`chip on ${url} passes axe and shows roving aria-pressed`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      const chip = page.locator('[data-a11y-scope="price-currency-chip"]').first();
      await expect(chip).toBeVisible();

      // Group has an accessible name via aria-labelledby.
      const group = chip.locator('[role="group"]').first();
      const labelledBy = await group.getAttribute("aria-labelledby");
      expect(labelledBy).toBeTruthy();
      const label = await page.locator(`#${labelledBy}`).first().innerText();
      expect(label.trim().length).toBeGreaterThan(0);

      // Roving pressed state.
      const eur = chip.locator('[data-currency-option="EUR"]');
      const usd = chip.locator('[data-currency-option="USD"]');
      await expect(eur).toHaveAttribute("aria-pressed", /true|false/);
      await usd.click();
      await expect(usd).toHaveAttribute("aria-pressed", "true");
      await expect(eur).toHaveAttribute("aria-pressed", "false");

      const violations = await scanScope(page, '[data-a11y-scope="price-currency-chip"]');
      expect(violations, `axe violations on ${url}: ${JSON.stringify(violations, null, 2)}`)
        .toEqual([]);
      await assertFocusVisible(page, '[data-a11y-scope="price-currency-chip"]');
    });
  }
});
