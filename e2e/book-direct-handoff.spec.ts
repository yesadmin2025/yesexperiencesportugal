import { test, expect } from "@playwright/test";

test("a chosen Signature day opens direct booking without requiring an enquiry", async ({ page }) => {
  await page.goto("/book");
  // Wait for hydration before changing a server-rendered native select.
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("#book-tour").selectOption("arrabida-wine-allinclusive");
  await page.getByTestId("request-to-instant-link").click();
  await expect(page).toHaveURL(/\/book\?tour=arrabida-wine-allinclusive/);
  await expect(page.getByLabel("Date of your experience")).toBeVisible();
  await expect(page.getByTestId("booking-request-submit")).toHaveCount(0);
});