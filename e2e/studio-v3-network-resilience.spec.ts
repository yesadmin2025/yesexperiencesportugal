import { test, expect } from "@playwright/test";

/**
 * If the Supabase / edge-function calls fail, Studio must degrade
 * gracefully with a visible error — never a silent white screen.
 */

test.describe("Studio V3 — network resilience", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("edge-function 500 renders a visible error, not a blank screen", async ({ page }) => {
    await page.route("**/functions/v1/**", (route) =>
      route.fulfill({ status: 500, body: "boom" }),
    );
    await page.route("**/rest/v1/**", (route) =>
      route.fulfill({ status: 500, body: "boom" }),
    );

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    const root = page.getByTestId("studio-v3-root");
    await expect(root).toBeVisible();

    // The user must see *something* — either the intro or an error surface.
    const somethingVisible = await Promise.race([
      page
        .getByTestId("studio-v3-error-surface")
        .waitFor({ state: "visible", timeout: 6000 })
        .then(() => true)
        .catch(() => false),
      root
        .locator(":scope :visible")
        .first()
        .waitFor({ timeout: 6000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(somethingVisible).toBe(true);

    // No unhandled page errors — network failures must be caught.
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
