import { test, expect } from "@playwright/test";

/**
 * `?saved=<token>` MUST take precedence over a local draft. Invalid tokens
 * surface a not-found state, not a silent fallback to the local draft
 * (that would look like a hydration bug).
 */

const STORAGE_KEY = "yes.studio.v3.draft.v1";

test.describe("Studio V3 — saved-link precedence", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("saved link beats local draft", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          draftId: "local",
          savedAt: 1,
          state: { phase: "feeling", feeling: "coastal" },
          tourId: null,
          addOnIds: [],
        }),
      ] as const,
    );

    await page.goto("/studio-v3?e2e=1&saved=e2e-known-good", {
      waitUntil: "domcontentloaded",
    });
    const root = page.getByTestId("studio-v3-root");
    await expect(root).toBeVisible();
    // saved-link hydration should NOT show the local-draft toast.
    await expect(page.getByText("Draft restored", { exact: true })).toHaveCount(0);
  });

  test("invalid saved link shows not-found state", async ({ page }) => {
    await page.goto("/studio-v3?e2e=1&saved=___nope___", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByTestId("studio-v3-saved-link-not-found").or(
        page.getByText(/couldn.t find|not found/i),
      ),
    ).toBeVisible({ timeout: 6000 });
  });
});
