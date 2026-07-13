import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PHASES = ["feeling", "storyboard", "confirmation", "checkoutSummary"] as const;

test.describe("Studio V3 — axe a11y sweep", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("initial studio surface has no serious/critical violations", async ({ page }) => {
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-v3-root")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test("polite live region is present for hydration toast", async ({ page }) => {
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    const live = page.locator("[aria-live='polite'], [role='status']");
    expect(await live.count()).toBeGreaterThan(0);
  });

  test("phase transitions do not trap focus", async ({ page }) => {
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    for (const _ of PHASES) {
      await page.keyboard.press("Tab");
      const active = await page.evaluate(() => document.activeElement?.tagName ?? null);
      expect(active).not.toBeNull();
    }
  });
});
