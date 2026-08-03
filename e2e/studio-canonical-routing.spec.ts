import { test, expect } from "@playwright/test";

/**
 * Canonical Studio routing guard.
 *
 * The public Experience Studio lives at /experience-studio and renders the
 * Studio V3 / Living Atlas implementation. This spec proves that:
 *  1. the canonical route mounts Studio V3 and self-canonicalises,
 *  2. homepage, desktop nav and mobile nav all enter it,
 *  3. legacy Studio routes (/studio, /studio-v2) land on the new Studio,
 *  4. the /studio-v3 alias still renders it but is noindex + canonicalised.
 */

const STUDIO_ROOT = '[data-testid="studio-v3-root"]';
const CANONICAL = "https://yesexperiencesportugal.com/experience-studio";

test("canonical /experience-studio renders Studio V3", async ({ page }) => {
  await page.goto("/experience-studio", { waitUntil: "domcontentloaded" });
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL);
});

test("/studio-v3 alias renders the same Studio, noindex + canonicalised", async ({ page }) => {
  await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

for (const legacy of ["/studio", "/studio-v2"]) {
  test(`legacy ${legacy} lands on the new Studio`, async ({ page }) => {
    await page.goto(legacy, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/experience-studio/);
    await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
  });
}

test("desktop navigation enters the new Studio", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const navLink = page.locator('header a[href^="/experience-studio"]').first();
  await expect(navLink).toBeVisible();
  await navLink.click();
  await expect(page).toHaveURL(/\/experience-studio/);
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
});

test("homepage CTAs point at the new Studio", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await page.locator('a[href^="/experience-studio"]').count()).toBeGreaterThan(0);
  expect(await page.locator('a[href^="/studio-v2"], a[href^="/studio-v3"]').count()).toBe(0);
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
  const link = page.locator('a[href^="/experience-studio"]:visible').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/experience-studio/);
  await expect(page.locator(STUDIO_ROOT).first()).toBeVisible({ timeout: 20_000 });
});
