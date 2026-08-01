/**
 * Phase 3 · §9 Launch QA smoke.
 *
 * Verifies the two conversion-critical surfaces still expose the
 * shared TrustStrip and locked CTA vocabulary. This is the minimum
 * gate before publishing.
 *
 * Canonical Sintra Signature route: /tours/sintra-cascais
 * (`sintra-private-tour` was never a real route — obsolete fixture.)
 */
import { test, expect } from "@playwright/test";
import { CANCELLATION } from "../src/config/business-nap";

test.describe("Launch smoke — trust strip + CTA vocabulary", () => {
  test("Signature card exposes locked CTA labels on the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Reserve .*/i }).first()).toBeVisible();
    // Locked labels
    await expect(page.getByText(/Check availability & reserve/i).first()).toBeVisible();
    await expect(page.getByText(/Tailor this day/i).first()).toBeVisible();
  });

  test("Tour detail page renders the Signature trust strip", async ({ page }) => {
    await page.goto("/tours/sintra-cascais");
    await expect(page.getByText(/Instant confirmation/i).first()).toBeVisible();
    await expect(page.getByText(CANCELLATION.signature.en).first()).toBeVisible();
    await expect(page.getByText(/A local on WhatsApp if you need help/i).first()).toBeVisible();
  });
});
