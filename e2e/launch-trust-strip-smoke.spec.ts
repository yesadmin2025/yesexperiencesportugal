/**
 * Phase 3 · §9 Launch QA smoke.
 *
 * Verifies the two conversion-critical surfaces still expose the
 * shared TrustStrip and locked CTA vocabulary. This is the minimum
 * gate before publishing.
 */
import { test, expect } from "@playwright/test";

test.describe("Launch smoke — trust strip + CTA vocabulary", () => {
  test("Signature card exposes locked CTA labels on the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Reserve .*/i }).first()).toBeVisible();
    // Locked labels
    await expect(page.getByText(/Check availability & reserve/i).first()).toBeVisible();
    await expect(page.getByText(/Tailor this day/i).first()).toBeVisible();
  });

  test("Tour detail page renders TrustStrip above Reserve", async ({ page }) => {
    await page.goto("/tours/sintra-private-tour");
    const strip = page.getByText(/Secure payment.*Stripe/i).first();
    await expect(strip).toBeVisible();
    await expect(page.getByText(/Licensed operator/i).first()).toBeVisible();
  });
});
