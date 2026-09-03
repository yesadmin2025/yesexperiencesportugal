/**
 * STUDIO CHECKOUT VALIDATION — every profile always reaches payment.
 *
 * Walks the live Studio funnel for a broad spread of traveller profiles
 * (cheese, tile, wine, heritage, faith, scholarly, coastal, and larger
 * parties) and proves each one ends on an instantly bookable day that opens
 * a real Stripe payment surface inline — never a curator hand-off.
 *
 * No payment is completed: the test stops once Stripe's own iframe mounts.
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-checkout-always-reaches-payment
 */

import { expect, test } from "@playwright/test";

import { fillGuestDetails, reachGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 706 } as const;

interface Profile {
  name: string;
  preferredOptionIds: readonly string[];
  partyAdults?: number;
}

const PROFILES: readonly Profile[] = [
  {
    name: "Cheese — hands-on Azeitão",
    preferredOptionIds: ["hands-on", "gastronomy", "hands-make-cheese", "wine-table-and-cheese"],
  },
  {
    name: "Tile — azulejo workshop",
    preferredOptionIds: ["hands-on", "heritage", "hands-paint-tile", "local-artisans"],
  },
  {
    name: "Wine — Arrábida cellar",
    preferredOptionIds: ["wine", "gastronomy", "wine-cellar-depth"],
  },
  {
    name: "Heritage — palaces and Atlantic",
    preferredOptionIds: ["heritage", "photography", "photo-landmarks"],
  },
  {
    name: "Faith — sanctuary time",
    preferredOptionIds: ["faith", "heritage", "faith-sanctuary-time"],
  },
  {
    name: "Scholarly — Templars and university",
    preferredOptionIds: ["faith", "heritage", "faith-templar-heritage"],
  },
  {
    name: "Coastal — from the water",
    preferredOptionIds: ["coast", "nature", "coast-from-the-water"],
  },
  {
    name: "Small group of five",
    preferredOptionIds: ["gastronomy", "wine", "wine-table-and-cheese"],
    partyAdults: 5,
  },
  {
    name: "Larger group of eight",
    preferredOptionIds: ["heritage", "coast", "coast-clifftop-views"],
    partyAdults: 8,
  },
];

test.describe("Studio V3 · every profile reaches payment @ 393px", () => {
  test.use({ viewport: VIEWPORT });

  for (const profile of PROFILES) {
    test(`${profile.name} → Stripe payment surface`, async ({ page }) => {
      test.setTimeout(240_000);

      const reached = await reachGuestDetails(page, {
        preferredOptionIds: profile.preferredOptionIds,
        partyAdults: profile.partyAdults,
      });
      expect(reached, `${profile.name}: funnel never reached Guest Details`).toBe(true);

      // The Studio must never end at a curator hand-off for these profiles.
      await expect(page.getByTestId("studio-v3-guest-details")).toBeVisible();

      await fillGuestDetails(page, { email: "qa+studio-sweep@example.com" });

      const submit = page.getByTestId("studio-v3-guest-details-submit");
      await submit.scrollIntoViewIfNeeded().catch(() => undefined);
      await submit.click({ timeout: 8_000 });

      const summary = page.getByTestId("studio-v3-checkout-summary");
      await expect(summary).toBeVisible({ timeout: 20_000 });
      await expect(summary).toContainText(/€/);

      const checkoutResponse = page.waitForResponse(
        (response) =>
          response.url().includes("create-signature-checkout") &&
          response.request().method() === "POST",
        { timeout: 45_000 },
      );
      await page.getByTestId("studio-v3-checkout-summary-reserve").click();

      const response = await checkoutResponse;
      expect(response.status(), `${profile.name}: checkout function failed`).toBe(200);
      const payload = (await response.json()) as {
        clientSecret?: string;
        publishableKey?: string;
      };
      expect(payload.clientSecret, `${profile.name}: no Stripe client secret`).toBeTruthy();
      expect(payload.publishableKey).toMatch(/^pk_/);

      await expect(page.getByTestId("studio-v3-checkout-summary-stripe-inline")).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.locator('iframe[src*="stripe.com"]').first()).toBeAttached({
        timeout: 45_000,
      });
    });
  }
});
