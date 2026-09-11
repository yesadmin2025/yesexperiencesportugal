import { expect, test, type Page } from "@playwright/test";

const SMART_START = '[data-testid="home-smart-start"]';

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const smartStart = page.locator(SMART_START);
  await expect(smartStart).toBeVisible({ timeout: 20_000 });
  return smartStart;
}

test.describe("homepage conversion paths", () => {
  test("shows exactly five first-class ways to begin", async ({ page }) => {
    const smartStart = await openHome(page);
    const primary = smartStart.locator("[data-home-primary-path]");
    await expect(primary).toHaveCount(5);

    await expect(primary.nth(0)).toHaveAttribute("href", "/experiences");
    await expect(primary.nth(1)).toHaveAttribute("href", "/studio-v3");
    await expect(primary.nth(2)).toHaveAttribute("href", "/multi-day");
    await expect(primary.nth(3)).toHaveAttribute("href", "/proposal-in-portugal");
    await expect(primary.nth(4)).toHaveAttribute("href", "/corporate");

    await expect(smartStart.getByText("A private day, ready to go", { exact: true })).toBeVisible();
    await expect(smartStart.getByText("Shape a day around you", { exact: true })).toBeVisible();
    await expect(
      smartStart.getByText("Plan a whole Portugal journey", { exact: true }),
    ).toBeVisible();
    await expect(
      smartStart.getByText("A private moment, planned discreetly", { exact: true }),
    ).toBeVisible();
    await expect(
      smartStart.getByText("Bring people together in Portugal", { exact: true }),
    ).toBeVisible();
  });

  test("does not pretend a generic visitor has a Studio draft", async ({ page }) => {
    await openHome(page);
    await expect(page.locator('[data-testid="home-smart-start-resume"]')).toHaveCount(0);
    await expect(page.getByText("Your Studio draft is waiting", { exact: true })).toHaveCount(0);
  });

  test("navigates directly to Studio from the custom-day path", async ({ page }) => {
    const smartStart = await openHome(page);
    const studio = smartStart.locator('[data-home-primary-path="studio"]');
    await studio.click();
    await expect(page).toHaveURL(/\/studio-v3(?:[?#].*)?$/);
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
    await expect(resume).toHaveAttribute("data-smart-start-recommended", "true");
  });
});
