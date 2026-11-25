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
    await expect(primary.nth(1)).toHaveAttribute("href", "/studio");
    await expect(primary.nth(2)).toHaveAttribute("href", "/portugal-travel-designer");
    await expect(primary.nth(3)).toHaveAttribute("href", "/proposal-in-portugal");
    await expect(primary.nth(4)).toHaveAttribute("href", "/corporate");

    // Premium headings can split their text across <em> descendants.
    // Compare the full rendered heading, not individual text nodes.
    const paths = [
      ["signature", "Private days, already designed by YES."],
      ["studio", "Your day, designed by you."],
      ["designer", "Full Portugal journeys, designed for you."],
      ["proposals", "Proposals & celebrations, held with care."],
      ["corporate", "Team days, incentives & private groups."],
    ] as const;
    for (const [id, title] of paths) {
      await expect(smartStart.locator(`[data-home-primary-path="${id}"]`)).toContainText(title);
    }
  });

  test("puts bookable products before the full reviews on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openHome(page);
    const order = await page.evaluate(() => [
      "five-paths", "signatures", "builder", "reviews", "special-occasions", "plan-map", "journal",
    ].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1));
    expect(order.every((top) => top >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const primary = page.locator(`${SMART_START} [data-path-priority="primary"]`);
    await expect(primary).toHaveCount(3);
    for (const card of await primary.all()) {
      const box = await card.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeLessThanOrEqual(393);
    }
    await expect(page.locator(".home-quick-trust a")).toHaveAttribute("href", "#reviews");
    await expect(page.locator("#signatures").getByRole("link", { name: /See dates and reserve/ }).first()).toHaveAttribute("href", "/tours/arrabida-wine-allinclusive");
  });

  test("does not pretend a generic visitor has a Studio draft", async ({ page }) => {
    await openHome(page);
    await expect(page.locator('[data-testid="home-smart-start-resume"]')).toHaveCount(0);
    await expect(page.getByText("Your Studio draft is waiting", { exact: true })).toHaveCount(0);
  });

  test("navigates directly to Studio from the custom-day path", async ({ page }) => {
    const smartStart = await openHome(page);
    const studio = smartStart.locator('[data-home-primary-path="studio"]');
    // The page is SSR-first and the Studio route is dynamically imported.
    // Wait for the homepage load event before the interaction, then assert
    // that the *real click* navigates; never replace it with page.goto().
    await page.waitForLoadState("load");
    // Full load can precede hydration in the SSR dev server. The public
    // app explicitly signals when links are interactive; never click early.
    await page.waitForFunction(() => (window as Window & { __APP_READY__?: boolean }).__APP_READY__ === true, undefined, { timeout: 30_000 });
    await expect(studio).toHaveAttribute("href", "/studio");
    await studio.scrollIntoViewIfNeeded();
    await studio.click();
    await expect(page).toHaveURL(/\/studio(?:[?#].*)?$/, { timeout: 20_000 });
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
    await expect(resume).toHaveAttribute("href", "/studio");
    await expect(resume).toHaveAttribute("data-smart-start-recommended", "true");
  });
});
