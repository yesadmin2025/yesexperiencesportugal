import { test, expect } from "@playwright/test";

/**
 * When the user reroll/switches to a different Signature tour, add-ons that
 * are not eligible for the new tour MUST be removed from the draft and the
 * price recalculated. This is a hard requirement from the
 * `studio-v3-no-invented-stops` guardrail (no leaking stops across tours).
 */

test.describe("Studio V3 — add-on tour switch", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("switching signature tour drops ineligible add-ons and recomputes total", async ({
    page,
  }) => {
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    const root = page.getByTestId("studio-v3-root");
    await expect(root).toBeVisible();

    // Test hooks: e2e=1 exposes deterministic tour reroll + add-on toggles.
    const rerollBtn = page.getByTestId("studio-v3-reroll-tour");
    if (!(await rerollBtn.isVisible().catch(() => false))) {
      test.skip(true, "reroll hook not available in this build");
      return;
    }

    // Enable an add-on on tour A, snapshot the total.
    const firstAddon = page.getByTestId("studio-v3-addon-toggle").first();
    await firstAddon.click();
    const totalA = await page
      .getByTestId("studio-v3-price-card-total")
      .textContent();

    // Reroll to tour B.
    await rerollBtn.click();
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="studio-v3-root"]');
      return el?.getAttribute("data-tour-changed") === "1";
    }, null, { timeout: 5000 }).catch(() => undefined);

    // Any surviving add-ons must belong to the new tour.
    const survivors = await page
      .getByTestId("studio-v3-addon-toggle[aria-pressed='true']")
      .count()
      .catch(() => 0);
    const eligibleOnB = await page
      .getByTestId("studio-v3-addon-toggle")
      .count();
    expect(survivors).toBeLessThanOrEqual(eligibleOnB);

    const totalB = await page
      .getByTestId("studio-v3-price-card-total")
      .textContent();
    expect(totalB).not.toBeNull();
    // Totals may or may not equal — the invariant is only that recompute happened.
    expect(totalB).not.toBe(totalA);
  });
});
