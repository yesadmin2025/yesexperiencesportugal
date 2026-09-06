import { expect, test, type Locator, type Page } from "@playwright/test";

const SMART_START = '[data-testid="home-smart-start"]';
const RECOMMENDATION = '[data-testid="home-smart-start-recommendation"]';

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const smartStart = page.locator(SMART_START);
  await expect(smartStart).toBeVisible({ timeout: 20_000 });
  return smartStart;
}

async function chooseIntent({
  page,
  smartStart,
  intent,
  expectedPath,
  product,
  cta,
}: {
  page: Page;
  smartStart: Locator;
  intent: Locator;
  expectedPath: string;
  product: string;
  cta: string;
}) {
  await expect(intent).toHaveAttribute("href", expectedPath);
  await intent.click();

  const outcome = await expect
    .poll(
      async () => {
        if (new URL(page.url()).pathname === expectedPath) return "native-navigation";

        const recommendation = smartStart.locator(RECOMMENDATION);
        if ((await recommendation.count()) > 0 && (await recommendation.isVisible())) {
          return "inline-recommendation";
        }

        return "pending";
      },
      { timeout: 15_000 },
    )
    .not.toBe("pending")
    .then(() =>
      new URL(page.url()).pathname === expectedPath
        ? "native-navigation"
        : "inline-recommendation",
    );

  if (outcome === "native-navigation") {
    await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll("/", "\\/")}(?:[?#].*)?$`));
    return;
  }

  const recommendation = smartStart.locator(RECOMMENDATION);
  await expect(smartStart.getByText(product, { exact: true })).toBeVisible();
  await expect(recommendation).toHaveAttribute("href", expectedPath);
  await expect(recommendation).toContainText(cta);
  await expect(
    page.locator(`a[href="${expectedPath}"][data-smart-start-recommended="true"]`),
  ).toHaveCount(1);
}

test.describe("homepage Smart Start", () => {
  test("converts a custom private-day intent into Studio", async ({ page }) => {
    const smartStart = await openHome(page);
    await chooseIntent({
      page,
      smartStart,
      intent: smartStart.getByRole("link", {
        name: "One private day — I want it shaped around me",
      }),
      expectedPath: "/studio-v3",
      product: "Experience Studio",
      cta: "Start in the Studio",
    });
  });

  test("converts a multi-day intent into Travel Designer", async ({ page }) => {
    const smartStart = await openHome(page);
    await chooseIntent({
      page,
      smartStart,
      intent: smartStart.getByRole("link", { name: "Several days in Portugal" }),
      expectedPath: "/multi-day",
      product: "Portugal Travel Designer",
      cta: "Begin my journey",
    });
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
