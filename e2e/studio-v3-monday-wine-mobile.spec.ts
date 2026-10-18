import { expect, test } from "@playwright/test";
import { fillGuestDetails, reachGuestDetails } from "./studio-v3-walk-to-reveal";

// A Monday wine day stays in Arrábida (closed market left out) and still
// reaches Stripe — the Studio never swaps region for a closed secondary stop.
test("Monday wine + Arrábida stays in region and reaches payment @ 393px", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 393, height: 852 });
  const reached = await reachGuestDetails(page, {
    preferredOptionIds: ["wine", "gastronomy", "wine-cellar-depth", "arrabida-setubal-azeitao"],
    weekday: 1,
  });
  expect(reached).toBe(true);
  const details = page.getByTestId("studio-v3-guest-details");
  await expect(details).toBeVisible();
  const text = (await details.innerText()).toLowerCase();
  expect(text).not.toContain("livramento");
  expect(text).not.toMatch(/évora|evora|alentejo/);
  console.log("DAY:", (await details.innerText()).slice(0, 600).replace(/\n+/g, " | "));
  await fillGuestDetails(page, { email: "qa+monday-wine@example.com" });
  await page.getByTestId("studio-v3-guest-details-submit").click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible({ timeout: 20_000 });
  const res = page.waitForResponse((r) => r.url().includes("create-signature-checkout"), { timeout: 45_000 });
  await page.getByTestId("studio-v3-checkout-summary-reserve").click();
  expect((await res).status()).toBe(200);
  await expect(page.locator('iframe[src*="stripe.com"]').first()).toBeAttached({ timeout: 45_000 });
});
