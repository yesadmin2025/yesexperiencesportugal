import { expect, test, type Locator, type Page } from "@playwright/test";

const SMART_START = '[data-testid="home-smart-start"]';
const RECOMMENDATION = '[data-testid="home-smart-start-recommendation"]';

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const smartStart = page.locator(SMART_START);
  await expect(smartStart).toBeVisible({ timeout: 20_000 });
  return smartStart;
}

test.describe("homepage Smart Start", () => {
  test("navigates a custom private-day intent directly to the Studio", async ({ page }) => {
    const smartStart = await openHome(page);
    const intent = smartStart.getByRole("link", {
      name: "One private day — I want it shaped around me",
    });
    await expect(intent).toHaveAttribute("href", "/studio-v3");
    await intent.click();
    await expect(page).toHaveURL(/\/studio-v3(?:[?#].*)?$/);
  });

  test("navigates a multi-day intent directly to Travel Designer", async ({ page }) => {
    const smartStart = await openHome(page);
    const intent = smartStart.getByRole("link", { name: "Several days in Portugal" });
    await expect(intent).toHaveAttribute("href", "/multi-day");
    await intent.click();
    await expect(page).toHaveURL(/\/multi-day(?:[?#].*)?$/);
  });

  test("shows the inline preview on hover and keyboard focus without clicking", async ({
    page,
  }) => {
    const smartStart = await openHome(page);

    // Hover preview (desktop pointer)
    const journey = smartStart.getByRole("link", { name: "Several days in Portugal" });
    await journey.hover();
    await expect(smartStart.getByText("Portugal Travel Designer", { exact: true })).toBeVisible();
    const recommendation = smartStart.locator(RECOMMENDATION);
    await expect(recommendation).toHaveAttribute("href", "/multi-day");
    await expect(recommendation).toContainText("Begin my journey");
    // Preview only — no navigation happened.
    expect(new URL(page.url()).pathname).toBe("/");

    // Keyboard focus preview
    const studio = smartStart.getByRole("link", {
      name: "One private day — I want it shaped around me",
    });
    await studio.focus();
    await expect(smartStart.getByText("Experience Studio", { exact: true })).toBeVisible();
    await expect(smartStart.locator(RECOMMENDATION)).toHaveAttribute("href", "/studio-v3");
    await expect(smartStart.locator(RECOMMENDATION)).toContainText("Start in the Studio");
    expect(new URL(page.url()).pathname).toBe("/");
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

    const smartStart = page.locator(SMART_START);
    const resume = smartStart.locator('[data-testid="home-smart-start-resume"]');
    await expect(resume).toBeVisible({ timeout: 20_000 });
    await expect(smartStart.getByText(/Coastal · Couple · Slow/)).toBeVisible();
    await expect(resume).toHaveAttribute("href", "/studio-v3");
    await expect(
      page.locator('a[href="/studio-v3"][data-smart-start-recommended="true"]'),
    ).toHaveCount(1);
  });
});
