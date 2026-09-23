import { test, expect } from "@playwright/test";

/**
 * Canonical Studio routing guard.
 *
 * The public Experience Studio lives at /studio and renders the
 * Studio V3 / Living Atlas implementation. This spec proves that:
 *  1. the canonical route mounts Studio V3 and self-canonicalises,
 *  2. homepage, desktop nav and mobile nav all enter it,
 *  3. legacy Studio routes land on the canonical Studio.
 */

const STUDIO_ROOT = '[data-testid="studio-v3-root"]';
const CANONICAL = "https://yesexperiencesportugal.com/studio";

test("canonical /studio renders Studio V3", async ({ page }) => {
  await page.goto("/studio", { waitUntil: "domcontentloaded" });
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL);
});

for (const legacy of ["/studio-v3", "/studio-v2", "/experience-studio"]) {
  test(`legacy ${legacy} lands on the new Studio`, async ({ page }) => {
    await page.goto(legacy, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/studio(?:\?|$)/);
    await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
  });
}

test("legacy Studio redirects preserve query parameters", async ({ page }) => {
  await page.goto("/studio-v3?source=qa", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/studio\?source=qa$/);
});

test("desktop navigation enters the new Studio", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const navLink = page.locator('header a[href^="/studio"]').first();
  await expect(navLink).toBeVisible();
  await navLink.click();
  await expect(page).toHaveURL(/\/studio(?:\?|$)/);
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
});

test("homepage CTAs point at the new Studio", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await page.locator('a[href^="/studio"]').count()).toBeGreaterThan(0);
  expect(
    await page
      .locator(
        'a[href^="/studio-v2"], a[href^="/experience-studio"], a[href^="/studio-living-atlas-preview"]',
      )
      .count(),
  ).toBe(0);
});

test("mobile navigation enters the new Studio", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page
    .locator(
      'header button[aria-label*="menu" i], header button[aria-controls], header button[aria-expanded]',
    )
    .first();
  await toggle.click();
  const link = page.locator('a[href^="/studio"]:visible').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/studio(?:\?|$)/);
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
});
