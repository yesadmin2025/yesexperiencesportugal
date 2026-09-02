import { test, expect } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

test.describe("P0 · Studio V3 checkout smoke @393px", () => {
  test.use({ viewport: { width: 393, height: 780 } });

  test("Your Day gate → Guest Details → Summary → Stripe", async ({ page }) => {
    test.setTimeout(240_000);

    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    const checkoutCalls: Array<{ status: number; body: string }> = [];
    page.on("response", async (res) => {
      if (res.url().includes("create-signature-checkout")) {
        checkoutCalls.push({ status: res.status(), body: await res.text().catch(() => "") });
      }
    });

    const reached = await reachGuestDetails(page);
    console.log("[p0] reachedGuestDetails=", reached);
    if (!reached) {
      const phase = await page
        .locator('[data-testid="studio-v3-root"]')
        .first()
        .getAttribute("data-phase")
        .catch(() => null);
      const primary = page.getByTestId("studio-v3-handoff-primary");
      console.log("[p0] phase=", phase, "primaryCount=", await primary.count());
      if ((await primary.count()) > 0) {
        console.log(
          "[p0] primary disabled=",
          await primary.first().isDisabled().catch(() => null),
          "blocked=",
          await primary.first().getAttribute("data-reserve-blocked"),
          "certified=",
          await primary.first().getAttribute("data-day-certified"),
        );
      }
      throw new Error("did not reach guest details");
    }

    await fillGuestDetails(page);
    const submit = page.getByTestId("studio-v3-guest-details-submit");
    await submit.scrollIntoViewIfNeeded().catch(() => undefined);
    await submit.click({ timeout: 8_000 });

    const summary = page.getByTestId("studio-v3-checkout-summary");
    await expect(summary).toBeVisible({ timeout: 20_000 });

    const reserve = page.getByTestId("studio-v3-checkout-summary-reserve");
    await reserve.scrollIntoViewIfNeeded().catch(() => undefined);
    await reserve.click({ timeout: 10_000 });

    const inline = page.getByTestId("studio-v3-checkout-summary-stripe-inline");
    const mounted = await inline
      .waitFor({ state: "visible", timeout: 45_000 })
      .then(() => true)
      .catch(() => false);
    const iframeCount = await page.locator('iframe[name^="__privateStripeFrame"]').count();
    const err = await page
      .getByTestId("studio-v3-checkout-summary-error")
      .innerText()
      .catch(() => "");

    console.log(
      "[p0] checkoutCalls=",
      JSON.stringify(
        checkoutCalls.map((c) => ({
          status: c.status,
          hasClientSecret: /"clientSecret"\s*:\s*"[^"]+"/.test(c.body),
          pk: (c.body.match(/"publishableKey"\s*:\s*"(pk_[^"]*)"/) ?? [])[1] ?? null,
          body: c.body.slice(0, 400),
        })),
      ),
    );
    console.log("[p0] inlineMounted=", mounted, "iframes=", iframeCount, "error=", err);
    console.log("[p0] consoleErrors=", consoleErrors.slice(0, 5));

    expect(checkoutCalls.length, "checkout call made").toBeGreaterThan(0);
    expect(checkoutCalls.at(-1)!.status).toBe(200);
    expect(mounted || iframeCount > 0).toBe(true);
  });
});
