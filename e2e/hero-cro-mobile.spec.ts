import { test, expect } from "@playwright/test";
import { HERO_COPY } from "../src/content/hero-copy";

test.use({ viewport: { width: 393, height: 852 } });

test("first mobile screen keeps the service and all three paths tappable", async ({ page }) => {
  await page.goto("/?hero=last");
  const descriptor = page.locator('[data-section="hero"] [data-hero-field="subheadline"]');
  const paths = [
    { selector: '[data-hero-field="primaryCta"]', href: "/studio" },
    { selector: '[data-hero-field="secondaryCta"]', href: "/experiences" },
    { selector: '[data-testid="hero-travel-designer"]', href: "/portugal-travel-designer" },
  ];
  await expect(descriptor).toBeVisible();
  await expect(descriptor).toHaveText(HERO_COPY.subheadline);
  for (const { selector, href } of paths) {
    const link = page.locator(`[data-section="hero"] ${selector}`);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(393);
    expect(box.y + box.height).toBeLessThanOrEqual(852);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const third = page.locator('[data-testid="hero-travel-designer"]');
  await expect(third).toBeInViewport();
  await third.click();
  await expect(page).toHaveURL(/\/portugal-travel-designer\/?$/);
});