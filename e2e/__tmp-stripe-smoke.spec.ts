import { test, expect } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

const VIEWPORT = { width: 393, height: 706 } as const;

test.describe("tmp stripe smoke @ 393px", () => {
  test.use({ viewport: VIEWPORT });

  test("reserve → create-signature-checkout", async ({ page }) => {
    test.setTimeout(600_000);
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
    });

    if (!(await reachGuestDetails(page))) test.skip(true, "did not reach guest details");
    await fillGuestDetails(page);
    await page.getByTestId("studio-v3-guest-details-submit").click({ timeout: 8_000 });
    await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });

    const respP = page
      .waitForResponse((r) => r.url().includes("create-signature-checkout"), { timeout: 60_000 })
      .catch(() => null);
    await page.getByTestId("studio-v3-checkout-summary-reserve").click({ timeout: 8_000 });
    const resp = await respP;
    let status = -1;
    let bodyShape = "no-response";
    let hasClientSecret = false;
    if (resp) {
      status = resp.status();
      const text = await resp.text().catch(() => "");
      hasClientSecret = /"clientSecret"\s*:\s*"[^"]+"/.test(text);
      bodyShape = text.slice(0, 600);
    }
    const iframe = page.locator('iframe[name^="__privateStripeFrame"], iframe[src*="stripe"]');
    const mounted = await iframe
      .first()
      .waitFor({ state: "attached", timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    const phase = await page
      .locator('[data-testid="studio-v3-root"]')
      .first()
      .getAttribute("data-phase")
      .catch(() => null);

    console.log(
      "SMOKE_RESULT " +
        JSON.stringify({ status, hasClientSecret, mounted, phase, bodyShape, consoleErrors }),
    );
  });
});
