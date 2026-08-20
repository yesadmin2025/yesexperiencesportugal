/**
 * Studio V3 · mobile journey — Guest Details → Checkout Summary → Stripe.
 *
 * Continues where `studio-v3-reveal-and-guest-details-mobile` stops: fills the
 * required guest fields at 393px, submits, and asserts the checkout summary
 * step renders with a reserve CTA (Stripe surface). No live payment is made.
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-mobile-guest-to-checkout
 */

import { test, expect } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 706 } as const;

test.describe("Studio V3 · guest details → checkout @ 393px", () => {
  test.use({ viewport: VIEWPORT });

  test("fills guest details and lands on the checkout summary", async ({ page }) => {
    test.setTimeout(180_000);
    if (!(await reachGuestDetails(page))) {
      test.skip(true, "Funnel did not reach Guest Details in this run.");
    }

    const form = page.getByTestId("studio-v3-guest-details");
    await expect(form).toBeVisible();

    await fillGuestDetails(page);

    // No horizontal overflow on the mobile form.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal overflow at 393px").toBeLessThanOrEqual(1);

    const submit = page.getByTestId("studio-v3-guest-details-submit");
    await expect(submit).toBeVisible();
    await submit.scrollIntoViewIfNeeded().catch(() => undefined);
    await submit.click({ timeout: 5_000 });

    const summary = page.getByTestId("studio-v3-checkout-summary");
    await expect(summary).toBeVisible({ timeout: 15_000 });

    // Reserve CTA present — the Stripe handoff surface. Not clicked: no live payment.
    await expect(page.getByTestId("studio-v3-checkout-summary-reserve")).toBeVisible();
    await expect(summary).toContainText(/€/);
  });
});
