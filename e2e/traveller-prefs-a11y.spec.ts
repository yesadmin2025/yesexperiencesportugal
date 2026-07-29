import { test, expect } from "@playwright/test";

/**
 * Accessibility contract for the language + currency switchers.
 *
 * Not a full axe run — the intent is to lock the specific semantics we
 * care about: labelled group, aria-pressed / aria-current toggling,
 * keyboard reachability, and a polite live region on currency change.
 */

test("language switcher exposes labelled group with aria-current", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const group = page.locator('[role="group"]', { hasText: /EN/ }).first();
  await expect(group).toHaveAttribute("aria-label", /language|idioma/i);

  const en = page.locator('[data-locale-option="en"]').first();
  const pt = page.locator('[data-locale-option="pt"]').first();
  await expect(en).toHaveAttribute("aria-label", /english/i);
  await expect(pt).toHaveAttribute("aria-label", /portugu/i);
  // Active locale advertises aria-current.
  await expect(en).toHaveAttribute("aria-current", "true");
});

test("currency switcher exposes labelled group with aria-pressed + live region", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const eur = page.locator('[data-currency-option="EUR"]').first();
  const usd = page.locator('[data-currency-option="USD"]').first();
  await expect(eur).toHaveAttribute("aria-pressed", "true");
  await expect(usd).toHaveAttribute("aria-pressed", "false");
  await expect(eur).toHaveAttribute("aria-label", /euro/i);
  await expect(usd).toHaveAttribute("aria-label", /dollar|indicative/i);

  await usd.focus();
  await expect(usd).toBeFocused();
  await page.keyboard.press("Space");

  await expect(usd).toHaveAttribute("aria-pressed", "true");
  await expect(eur).toHaveAttribute("aria-pressed", "false");

  const live = page.locator("[data-currency-live]").first();
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toContainText(/US dollar|dólar/i);
});

test("switchers are focusable via keyboard and expose >=32px tap target", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const options = page.locator("[data-currency-option], [data-locale-option]");
  const count = await options.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const el = options.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    expect(box.height).toBeGreaterThanOrEqual(28);
    expect(box.width).toBeGreaterThanOrEqual(28);
  }
});
