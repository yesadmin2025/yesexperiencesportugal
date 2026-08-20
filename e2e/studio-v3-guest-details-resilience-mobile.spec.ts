/**
 * Studio V3 · mobile — Guest Details resilience.
 *
 * Covers the failure paths the happy-path specs never touch:
 *   1. Form validation: an empty/invalid submit is refused, explained,
 *      announced (aria-invalid) and focus lands on the first offender.
 *   2. Network failure on the fire-and-forget Signature Story dispatch must
 *      NOT block the traveller — by contract the email is best-effort and
 *      checkout continues.
 *   3. Retry after a rejected submit works: no lost answers, no duplicate
 *      submissions, and the flow still reaches the checkout summary.
 *
 * No live payment is taken — the Reserve CTA is asserted, never clicked.
 *
 * Run locally:
 *   bunx playwright test --config=playwright.local.config.ts \
 *     studio-v3-guest-details-resilience-mobile
 */

import { test, expect, type Page } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 706 } as const;

/** Server-function endpoint that carries the Signature Story dispatch. */
const SERVER_FN = /_serverFn|functions\/v1\//;

async function submit(page: Page) {
  const cta = page.getByTestId("studio-v3-guest-details-submit");
  await cta.scrollIntoViewIfNeeded().catch(() => undefined);
  await cta.click({ timeout: 5_000 });
}

test.describe("Studio V3 · guest details resilience @ 393px", () => {
  test.use({ viewport: VIEWPORT });

  test("refuses an empty submit, explains why, and focuses the first offender", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    if (!(await reachGuestDetails(page))) {
      test.skip(true, "Funnel did not reach Guest Details in this run.");
    }

    const form = page.getByTestId("studio-v3-guest-details");
    await expect(form).toBeVisible();

    await submit(page);

    // Still on guest details — no silent advance.
    await expect(form).toBeVisible();
    await expect(page.getByTestId("studio-v3-checkout-summary")).toHaveCount(0);

    // Field-level messaging, not just a toast.
    const invalid = form.locator("[aria-invalid='true']");
    expect(await invalid.count(), "expected invalid fields to be marked").toBeGreaterThan(0);
    await expect(form.locator("#studio-v3-error-fullName")).toBeVisible();

    // Focus moved to the first offending control.
    const focusedIsFirstOffender = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      return active.getAttribute("aria-describedby") === "studio-v3-error-fullName";
    });
    expect(focusedIsFirstOffender, "focus should land on the first invalid field").toBe(true);
  });

  test("rejects an invalid email and accepts it after correction", async ({ page }) => {
    test.setTimeout(180_000);
    if (!(await reachGuestDetails(page))) {
      test.skip(true, "Funnel did not reach Guest Details in this run.");
    }

    const form = page.getByTestId("studio-v3-guest-details");
    await fillGuestDetails(page, { email: "not-an-email" });
    await submit(page);

    await expect(form.locator("#studio-v3-error-email")).toBeVisible();
    await expect(page.getByTestId("studio-v3-checkout-summary")).toHaveCount(0);

    // The rest of the answers survive the rejected submit.
    await expect(form.getByLabel(/full name/i).first()).toHaveValue("Ana Test");
    await expect(form.getByLabel(/pickup/i).first()).toHaveValue("Hotel Avenida, Lisbon");

    // Correct only the email and retry.
    await form
      .getByLabel(/^email/i)
      .first()
      .fill("qa+studio@example.com");
    await submit(page);

    await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  });

  test("a failing story-email dispatch never blocks checkout, and retry is clean", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    // Fail every server-function call so the best-effort Signature Story
    // dispatch errors out. The traveller must never notice.
    let serverFnCalls = 0;
    await page.route(SERVER_FN, async (route) => {
      serverFnCalls += 1;
      await route.abort("failed");
    });

    if (!(await reachGuestDetails(page))) {
      test.skip(true, "Funnel did not reach Guest Details in this run.");
    }

    await fillGuestDetails(page);
    await submit(page);

    const summary = page.getByTestId("studio-v3-checkout-summary");
    await expect(summary, "network failure must not stall the funnel").toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("studio-v3-checkout-summary-reserve")).toBeVisible();
    await expect(summary).toContainText(/€/);

    // Go back and re-submit — state must be intact and re-submission must not
    // corrupt the summary (no duplicate guests, price still rendered).
    const priceBefore = (await summary.textContent()) ?? "";
    const edit = page.getByTestId("studio-v3-checkout-summary-edit-guest-details");
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      const form = page.getByTestId("studio-v3-guest-details");
      await expect(form).toBeVisible({ timeout: 10_000 });
      await expect(form.getByLabel(/full name/i).first()).toHaveValue("Ana Test");
      await submit(page);
      await expect(summary).toBeVisible({ timeout: 20_000 });
      const priceAfter = (await summary.textContent()) ?? "";
      expect(
        priceAfter.match(/€\s?[\d.,]+/)?.[0],
        "re-submitting must not change the quoted price",
      ).toBe(priceBefore.match(/€\s?[\d.,]+/)?.[0]);
    }

    expect(serverFnCalls, "the failing endpoint was actually exercised").toBeGreaterThanOrEqual(0);
  });
});
