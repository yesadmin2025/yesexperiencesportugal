import { test, expect } from "@playwright/test";

const SMART_START = '[data-testid="home-smart-start"]';

test.describe("homepage Smart Start", () => {
  test("recommends Studio for a custom private day", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(SMART_START)).toBeVisible({ timeout: 20_000 });

    await page
      .getByRole("button", { name: "One private day — I want it shaped around me" })
      .click();

    const recommendation = page.locator('[data-testid="home-smart-start-recommendation"]');
    await expect(page.getByText("Experience Studio", { exact: true })).toBeVisible();
    await expect(recommendation).toHaveAttribute("href", "/studio-v3");
    await expect(recommendation).toContainText("Start in the Studio");

    await expect(
      page.locator('a[href="/studio-v3"][data-smart-start-recommended="true"]'),
    ).toHaveCount(1);
  });

  test("recommends Travel Designer for a multi-day journey", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(SMART_START)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Several days in Portugal" }).click();

    const recommendation = page.locator('[data-testid="home-smart-start-recommendation"]');
    await expect(page.getByText("Portugal Travel Designer", { exact: true })).toBeVisible();
    await expect(recommendation).toHaveAttribute("href", "/multi-day");
    await expect(recommendation).toContainText("Begin my journey");
  });

  test("recognises a privacy-safe saved Studio draft", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const now = Date.now();
      window.localStorage.setItem(
        "yes.studio-v3.draft.v1",
        JSON.stringify({
          version: 1,
          updatedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          state: {
            phase: "rhythm",
            feeling: "coastal",
            companions: "couple",
            rhythm: "slow",
          },
        }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const resume = page.locator('[data-testid="home-smart-start-resume"]');
    await expect(resume).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Coastal · Couple · Slow/)).toBeVisible();
    await expect(resume).toHaveAttribute("href", "/studio-v3");
    await expect(
      page.locator('a[href="/studio-v3"][data-smart-start-recommended="true"]'),
    ).toHaveCount(1);
  });
});
