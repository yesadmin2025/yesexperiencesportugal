/**
 * Axe-core a11y checks for LanguageSwitcher and CurrencyToggle.
 *
 * Fails on any WCAG 2.1 A/AA violation in ARIA, contrast, or focus
 * within the switcher subtrees, across desktop header, mobile header
 * (persistent cluster outside the hamburger menu) and footer surfaces.
 *
 * Also asserts basic keyboard-focus visibility: the first control in
 * each scope must show a visible focus ring (non-zero outline OR
 * box-shadow) when focused via Tab.
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

test.describe("Switchers — axe-core a11y (mobile 393×780)", () => {
  test.use({ viewport: { width: 393, height: 780 } });

  test("mobile header switchers are visible outside the menu and pass axe", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Persistent, not hidden inside the hamburger menu.
    const lang = page.locator('[data-a11y-scope="language-switcher"]').first();
    const curr = page.locator('[data-a11y-scope="currency-toggle"]').first();
    await expect(lang).toBeVisible();
    await expect(curr).toBeVisible();

    for (const scope of [
      '[data-a11y-scope="language-switcher"]',
      '[data-a11y-scope="currency-toggle"]',
    ]) {
      const violations = await scanScope(page, scope);
      expect(violations, `axe violations in ${scope}: ${JSON.stringify(violations, null, 2)}`)
        .toEqual([]);
      await assertFocusVisible(page, scope);
    }
  });

  test("footer switchers pass axe on mobile", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();

    for (const scope of [
      'footer [data-a11y-scope="language-switcher"]',
      'footer [data-a11y-scope="currency-toggle"]',
    ]) {
      const violations = await scanScope(page, scope);
      expect(violations, `axe violations in ${scope}: ${JSON.stringify(violations, null, 2)}`)
        .toEqual([]);
    }
  });
});

test.describe("Switchers — axe-core a11y (desktop 1280×800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("desktop header switchers pass axe", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    for (const scope of [
      'header [data-a11y-scope="language-switcher"]',
      'header [data-a11y-scope="currency-toggle"]',
    ]) {
      const violations = await scanScope(page, scope);
      expect(violations, `axe violations in ${scope}: ${JSON.stringify(violations, null, 2)}`)
        .toEqual([]);
      await assertFocusVisible(page, scope);
    }
  });

  test("currency toggle roving aria-pressed reflects active selection", async ({ page }) => {
    await page.goto("/");
    const scope = page.locator('header [data-a11y-scope="currency-toggle"]').first();
    const eur = scope.locator('[data-currency-option="EUR"]');
    const usd = scope.locator('[data-currency-option="USD"]');

    await expect(eur).toHaveAttribute("aria-pressed", "true");
    await expect(usd).toHaveAttribute("aria-pressed", "false");

    await usd.click();
    await expect(usd).toHaveAttribute("aria-pressed", "true");
    await expect(eur).toHaveAttribute("aria-pressed", "false");
  });
});
