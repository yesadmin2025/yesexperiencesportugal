import { test, expect } from "@playwright/test";
import { reachGuestDetails, fillGuestDetails } from "./studio-v3-walk-to-reveal";

test("client fields precede day summary and Portuguese reaches the purchase snapshot", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.setViewportSize({ width: 393, height: 706 });
  expect(await reachGuestDetails(page), "Studio must reach the real guest form").toBe(true);
  const form = page.getByTestId("studio-v3-guest-details");
  const name = form.getByLabel(/full name/i).first();
  // Check arrival, before any scroll-to-field can hide an overlap.
  const nameBox = await name.boundingBox();
  const barBox = await page.getByTestId("studio-v3-guest-details-cta-bar").boundingBox();
  expect(nameBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  if (!nameBox || !barBox) throw new Error("Missing form or fixed payment bar");
  expect(nameBox.y + nameBox.height).toBeLessThanOrEqual(barBox.y);
  expect(nameBox.y).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: "/tmp/browser/studio-language-arrival.png" });
  expect(await page.getByTestId("studio-v3-guest-day-summary").getAttribute("open")).toBeNull();
  await fillGuestDetails(page, { fullName: "QA Studio Language", email: "qa+studio-language@example.com" });
  await page.getByTestId("studio-v3-language-change").click();
  await page.getByTestId("studio-v3-language-pt").click();
  await page.getByTestId("studio-v3-guest-details-submit").click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible();
  await page.getByTestId("studio-v3-checkout-summary-edit-guest-details").click();
  await expect(page.getByTestId("studio-v3-language-change").locator("..")).toContainText("Portuguese");
  await page.getByTestId("studio-v3-guest-details-submit").click();
  const responsePromise = page.waitForResponse(r => r.url().includes("create-signature-checkout") && r.request().method() === "POST");
  await page.getByTestId("studio-v3-checkout-summary-reserve").click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const request = response.request().postDataJSON();
  expect(request.environment).toBe("sandbox");
  expect(request.guestDetails.language).toBe("pt");
  const payload = await response.json();
  expect(payload.publishableKey).toMatch(/^pk_test_/);
  await expect(page.locator('iframe[src*="stripe.com"]').first()).toBeAttached({ timeout: 30_000 });
  await page.screenshot({ path: "/tmp/browser/studio-language-checkout.png" });
  // Print only the non-secret session identifier, never the client secret.
  const session = String(payload.clientSecret ?? "").split("_secret_")[0];
  console.log("QA sandbox checkout session:", session);
});