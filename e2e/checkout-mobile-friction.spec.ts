import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 393, height: 852 } });

for (const flow of ["signature", "book", "tailor"] as const) {
  test(`${flow}: real mobile reservation reaches sandbox Stripe without payment`, async ({ page }) => {
    test.setTimeout(120_000);
    if (flow === "signature") {
      await page.goto("/experiences");
      await page.getByRole("link", { name: /^See dates and reserve/ }).first().click();
    } else {
      await page.goto(flow === "book"
        ? "/book?tour=arrabida-wine-allinclusive"
        : "/tours/arrabida-wine-allinclusive/tailor");
    }
    const cookies = page.getByRole("button", { name: "Essential only", exact: true });
    if (await cookies.isVisible().catch(() => false)) await cookies.click();
    const date = page.getByLabel(flow === "tailor" ? "Date" : "Date of your experience", { exact: true });
    await date.waitFor();
    await page.waitForTimeout(800);
    const future = new Date();
    future.setDate(future.getDate() + 25);
    await date.fill(future.toISOString().slice(0, 10));
    if (flow === "tailor") {
      // A real adjustment, using the configured activity price authority.
      await page.getByTestId("tailor-winery-increase").click();
    }
    await page.getByTestId(flow === "tailor" ? "tailor-reserve-cta" : "signature-reserve-cta").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Continue to payment", exact: true }).click();
    await expect(dialog.getByTestId("final-details-error-summary")).toBeVisible();
    await dialog.getByRole("textbox", { name: /full name/i }).fill("Checkout QA");
    await dialog.getByRole("textbox", { name: /^email/i }).fill("qa+mobile-checkout@example.com");
    await dialog.getByRole("textbox", { name: /phone/i }).fill("+351910000000");
    await dialog.getByTestId("pickup-later-toggle").check();
    const totalBefore = await dialog.locator('[data-testid="charge-summary-total"]').textContent().catch(() => null);
    const responsePromise = page.waitForResponse((r) => r.url().includes("create-signature-checkout") && r.request().method() === "POST");
    await dialog.getByRole("button", { name: "Continue to payment", exact: true }).click();
    const response = await responsePromise;
    expect(response.request().postDataJSON().environment).toBe("sandbox");
    expect(response.status()).toBe(200);
    await expect(page.locator('iframe[src*="stripe.com"]').first()).toBeAttached({ timeout: 45_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `/tmp/browser/checkout-audit/${flow}-verified.png` });
  });
}

test("Signature missing date does not offer last-minute support", async ({ page }) => {
  await page.goto("/book?tour=arrabida-wine-allinclusive");
  await page.getByLabel("Date of your experience").waitFor();
  await page.waitForTimeout(800);
  const cookies = page.getByRole("button", { name: "Essential only", exact: true });
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
  await page.getByTestId("signature-reserve-cta").click();
  await expect(page.getByTestId("signature-block-summary")).toBeVisible();
  await expect(page.getByTestId("signature-last-minute-whatsapp")).toHaveCount(0);
});