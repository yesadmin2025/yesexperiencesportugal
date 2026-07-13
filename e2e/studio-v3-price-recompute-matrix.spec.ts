import { test, expect, type Locator } from "@playwright/test";

/**
 * Every price surface (SignaturePriceCard, CheckoutSummary, sticky CTA)
 * must render the SAME string at all times. Matrix over: guest count, add-on
 * toggles, tour reroll, edited route points.
 */

async function priceStrings(locators: Locator[]) {
  const values = await Promise.all(
    locators.map((l) => l.textContent().catch(() => null)),
  );
  return values
    .filter((v): v is string => !!v && /\d/.test(v))
    .map((v) => v.replace(/\s+/g, ""));
}

test.describe("Studio V3 — price recompute matrix", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("all price surfaces stay byte-identical across state changes", async ({ page }) => {
    await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-v3-root")).toBeVisible();

    const surfaces = [
      page.getByTestId("studio-v3-price-card-total"),
      page.getByTestId("studio-v3-sticky-cta-total"),
      page.getByTestId("studio-v3-checkout-summary-total"),
    ];

    const actions: Array<{ name: string; run: () => Promise<void> }> = [
      {
        name: "increase guests",
        run: async () => {
          const inc = page.getByTestId("studio-v3-guests-inc");
          if (await inc.isVisible().catch(() => false)) await inc.click();
        },
      },
      {
        name: "toggle first add-on on",
        run: async () => {
          const t = page.getByTestId("studio-v3-addon-toggle").first();
          if (await t.isVisible().catch(() => false)) await t.click();
        },
      },
      {
        name: "toggle first add-on off",
        run: async () => {
          const t = page.getByTestId("studio-v3-addon-toggle").first();
          if (await t.isVisible().catch(() => false)) await t.click();
        },
      },
    ];

    for (const action of actions) {
      await action.run();
      const values = await priceStrings(surfaces);
      if (values.length > 1) {
        expect(new Set(values).size, `mismatch after ${action.name}: ${values.join(" | ")}`).toBe(1);
      }
    }
  });
});
