import { test, expect } from "@playwright/test";
import { HERO_COPY } from "../src/content/hero-copy";

test.use({ viewport: { width: 393, height: 852 } });

test("mobile hero CTAs are tappable and Travel Designer remains reachable", async ({ page }) => {
  await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
  const hero = page.locator('[data-section="hero"]');
  const descriptor = hero.locator('[data-hero-field="subheadline"]');
  await expect(descriptor).toBeVisible();
  await expect(descriptor).toHaveText(HERO_COPY.subheadline);

  // The current premium hero exposes TWO direct actions. Travel Designer
  // belongs in the separately crawlable Five Ways section, not an invented
  // third overlay CTA. Keep tap-target and viewport assertions for both.
  for (const { selector, href } of [
    { selector: '[data-hero-field="primaryCta"]', href: "/studio" },
    { selector: '[data-hero-field="secondaryCta"]', href: "/experiences" },
  ]) {
    const link = hero.locator(selector);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
    const box = await link.boundingBox();
    expect(box, `${href} CTA must have a rendered box`).not.toBeNull();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(393);
    expect(box.y + box.height).toBeLessThanOrEqual(852);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const designer = page.locator('[data-home-primary-path="designer"]');
  await expect(designer).toHaveAttribute("href", "/portugal-travel-designer");
  await designer.scrollIntoViewIfNeeded();
  await expect(designer).toBeInViewport();
  const target = await designer.boundingBox();
  expect(target).not.toBeNull();
  expect(target!.height).toBeGreaterThanOrEqual(44);
  await designer.click();
  await expect(page).toHaveURL(/\/portugal-travel-designer\/?$/, { timeout: 20_000 });
});
