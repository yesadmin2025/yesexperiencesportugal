import { expect, test, type Page } from "@playwright/test";

const SMART_START = '[data-testid="home-smart-start"]';
const RECOMMENDATION = '[data-testid="home-smart-start-recommendation"]';

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const smartStart = page.locator(SMART_START);
  await expect(smartStart).toBeVisible({ timeout: 20_000 });
  return smartStart;
}

test.describe("homepage Smart Start", () => {
  test("sends a custom private-day intent directly to Studio", async ({ page }) => {
    const smartStart = await openHome(page);
    const intent = smartStart.getByRole("link", {
      name: "One private day — I want it shaped around me",
    });

    await expect(intent).toHaveAttribute("href", "/studio-v3");
    await intent.click();
    await expect(page).toHaveURL(/\/studio-v3(?:[?#].*)?$/);
  });

  test("sends a multi-day intent directly to Travel Designer", async ({ page }) => {
    const smartStart = await openHome(page);
    const intent = smartStart.getByRole("link", { name: "Several days in Portugal" });

    await expect(intent).toHaveAttribute("href", "/multi-day");
    await intent.click();
    await expect(page).toHaveURL(/\/multi-day(?:[?#].*)?$/);
  });

  test("previews the intelligent recommendation on desktop hover without adding a click", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("mobile"), "Hover preview is a desktop enhancement");

    const smartStart = await openHome(page);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    const intent = smartStart.getByRole("link", {
      name: "One private day — I want it shaped around me",
    });
    await intent.hover();

    const recommendation = smartStart.locator(RECOMMENDATION);
    await expect(smartStart.getByText("Experience Studio", { exact: true })).toBeVisible();
    await expect(recommendation).toHaveAttribute("href", "/studio-v3");
    await expect(recommendation).toContainText("Start in the Studio");
    await expect(
      page.locator('a[href="/studio-v3"][data-smart-start-recommended="true"]'),
    ).toHaveCount(1);
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
