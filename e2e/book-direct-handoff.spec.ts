import { test, expect } from "@playwright/test";

test("a chosen Signature day opens direct booking without requiring an enquiry", async ({ page }) => {
  await page.goto("/book");
  // Native controls can appear before React hydrates; retry until state is applied.
  await expect(async () => {
    await page.locator("#book-tour").selectOption("");
    await page.locator("#book-tour").selectOption("arrabida-wine-allinclusive");
    await expect(page.getByTestId("request-to-instant-link")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30000 });
  await page.getByTestId("request-to-instant-link").click();
  await expect(page).toHaveURL(/\/book\?tour=arrabida-wine-allinclusive/);
  await expect(page.getByLabel("Date of your experience")).toBeVisible();
  await expect(page.getByTestId("booking-request-submit")).toHaveCount(0);
});