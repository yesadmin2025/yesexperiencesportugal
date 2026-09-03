/**
 * TEMPORARY validation spec — cheese / tile / wine / heritage Studio flows
 * driven end-to-end to the Stripe Embedded Checkout mount. NO PAYMENT.
 * Delete after the run.
 */
import { test, expect } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 800 } as const;

const PROFILES: { name: string; ids: string[] }[] = [
  {
    name: "cheese",
    ids: ["hands-on", "gastronomy", "hands-make-cheese", "couple", "elevated", "full", "flexible"],
  },
  {
    name: "tile",
    ids: ["hands-on", "local-life", "hands-paint-tile", "couple", "elevated", "full", "flexible"],
  },
  {
    name: "wine",
    ids: ["wine", "gastronomy", "wine-cellar-depth", "couple", "elevated", "full", "flexible"],
  },
  {
    name: "heritage",
    ids: ["heritage", "local-life", "couple", "elevated", "full", "flexible"],
  },
];

test.describe("Studio V3 · four profiles → Stripe @393px", () => {
  test.use({ viewport: VIEWPORT });

  for (const profile of PROFILES) {
    test(`${profile.name} day reaches Stripe checkout`, async ({ page }) => {
      test.setTimeout(240_000);
      const reached = await reachGuestDetails(page, { preferredOptionIds: profile.ids });
      expect(reached, `${profile.name}: reached Guest Details`).toBe(true);

      await fillGuestDetails(page, { email: `qa+${profile.name}@example.com` });
      await page.getByTestId("studio-v3-guest-details-submit").click();

      const summary = page.getByTestId("studio-v3-checkout-summary");
      await expect(summary).toBeVisible({ timeout: 20_000 });
      const summaryText = (await summary.textContent()) ?? "";

      const wait = page.waitForResponse(
        (r) => r.url().includes("create-signature-checkout") && r.request().method() === "POST",
        { timeout: 45_000 },
      );
      await page.getByTestId("studio-v3-checkout-summary-reserve").click();
      const response = await wait;
      const status = response.status();
      const payload = (await response.json().catch(() => ({}))) as {
        clientSecret?: string;
        publishableKey?: string;
      };
      console.log(
        `[${profile.name}] status=${status} clientSecret=${payload.clientSecret ? payload.clientSecret.slice(0, 14) : "none"} pk=${payload.publishableKey?.slice(0, 8) ?? "none"}`,
      );
      console.log(`[${profile.name}] summary=${summaryText.replace(/\s+/g, " ").slice(0, 400)}`);
      expect(status).toBe(200);
      expect(payload.clientSecret).toBeTruthy();
      expect(payload.publishableKey).toMatch(/^pk_/);
      await expect(page.locator('iframe[src*="stripe.com"]').first()).toBeAttached({
        timeout: 45_000,
      });
    });
  }
});
