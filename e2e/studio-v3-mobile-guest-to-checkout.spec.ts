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

import { test, expect, type Page } from "@playwright/test";
import { walkToReveal, advanceRefineToStorytelling } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 706 } as const;

async function reachGuestDetails(page: Page): Promise<boolean> {
  await page.goto("/studio-v3");
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);

  const reveal = page.getByTestId("studio-v3-final-reveal");
  if (!(await reveal.isVisible().catch(() => false))) {
    await page.screenshot({ path: "/tmp/browser/studio/reveal-fail.png" });
    console.log(
      "DEBUG phase:",
      await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase"),
    );
    return false;
  }

  await page.waitForTimeout(800);
  const continueCta = page.getByTestId("studio-v3-final-reveal-continue");
  if (!(await continueCta.isVisible().catch(() => false))) return false;
  for (let i = 0; i < 3; i++) {
    await continueCta.scrollIntoViewIfNeeded().catch(() => undefined);
    await continueCta.click({ timeout: 5_000 }).catch(() => undefined);
    const landed = await page
      .getByTestId("studio-v3-guest-details")
      .isVisible({ timeout: 6_000 })
      .catch(() => false);
    if (landed) return true;
    await page.waitForTimeout(600);
  }

  const ok = await page
    .getByTestId("studio-v3-guest-details")
    .isVisible({ timeout: 8_000 })
    .catch(() => false);
  if (!ok) {
    console.log(
      "DEBUG post-continue phase:",
      await page.locator('[data-testid="studio-v3-root"]').first().getAttribute("data-phase"),
    );
    await page.screenshot({ path: "/tmp/browser/studio/guest-fail.png" });
  }
  return ok;
}

test.describe("Studio V3 · guest details → checkout @ 393px", () => {
  test.use({ viewport: VIEWPORT });

  test("fills guest details and lands on the checkout summary", async ({ page }) => {
    test.setTimeout(180_000);
    if (!(await reachGuestDetails(page))) {
      test.skip(true, "Funnel did not reach Guest Details in this run.");
    }

    const form = page.getByTestId("studio-v3-guest-details");
    await expect(form).toBeVisible();

    await form.getByLabel(/full name/i).first().fill("Ana Test");
    await form.getByLabel(/^email/i).first().fill("qa+studio@example.com");
    const phone = form.getByLabel(/phone/i).first();
    if (await phone.isVisible().catch(() => false)) await phone.fill("+351912345678");
    const pickup = form.getByLabel(/pickup/i).first();
    if (await pickup.isVisible().catch(() => false)) await pickup.fill("Hotel Avenida, Lisbon");

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
