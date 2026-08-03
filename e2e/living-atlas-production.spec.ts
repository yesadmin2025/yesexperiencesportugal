import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

async function waitForLivingAtlasHydration(page: Page) {
  await expect(page.getByTestId("living-atlas-app")).toHaveAttribute("data-hydrated", "true", {
    timeout: 45_000,
  });
}

async function chooseFirstAvailableDate(page: Page) {
  const availableDay = page.locator(".rdp-day_button:not([disabled])").first();
  await expect(availableDay).toBeVisible();
  await availableDay.click();
}

async function walkToShape(page: Page) {
  await page.goto("/studio-v3");
  await waitForLivingAtlasHydration(page);

  await expect(
    page.getByRole("heading", { name: "There is more than one Portugal. Let's find yours." }),
  ).toBeVisible();
  await expect(page.getByText("YES Experience Studio", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /I know where I want to go/i }).click();
  await expect(page.getByRole("heading", { name: "Where should the day live?" })).toBeVisible();
  await page.getByRole("button", { name: /Arrábida, Setúbal & Azeitão/i }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "When should Portugal take shape?" }),
  ).toBeVisible();
  await chooseFirstAvailableDate(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What belongs in your day?" })).toBeVisible();
  await page.getByRole("button", { name: /Wine & the Portuguese table/i }).click();
  await page.getByRole("button", { name: /The Atlantic/i }).click();
  await page.getByRole("button", { name: /Local life & quieter places/i }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What should lead?" })).toBeVisible();
  await page.getByRole("button", { name: /Wine & the Portuguese table/i }).click();
  await page.getByRole("button", { name: /The Atlantic/i }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const forkChoice = page.getByRole("button", { name: /This is my direction/i }).first();
  if (await forkChoice.isVisible().catch(() => false)) {
    await forkChoice.click();
  }

  await expect(page.getByRole("button", { name: /Shape this day/i })).toBeVisible();
  await page.getByRole("button", { name: /Shape this day/i }).click();

  const waterMode = page.getByRole("button", { name: "From the water" });
  await expect(waterMode).toBeVisible();
  await waterMode.click();
  await expect(waterMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Continue to booking" })).toBeEnabled();
}

test("Living Atlas reaches the checkout summary and restores the composed day", async ({
  page,
}) => {
  await walkToShape(page);

  await page.reload();
  await waitForLivingAtlasHydration(page);
  await expect(page.getByText("Your saved day has been restored.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to booking" })).toBeEnabled();

  await page.getByRole("button", { name: "Continue to booking" }).click();
  await expect(page.getByTestId("studio-v3-guest-details")).toBeVisible();

  const body = page.locator("body");
  await expect(body).not.toContainText("Stripe sandbox");
  await expect(body).not.toContainText("Isolated preview");

  await page.getByLabel(/^Full name/).fill("Living Atlas Test");
  await page.getByLabel(/^Email/).fill("living-atlas@example.com");
  await page.getByLabel(/Phone \/ WhatsApp/).fill("+351 910 000 000");
  await page.getByLabel(/Pickup address \/ hotel/).fill("Lisbon test hotel");
  await page
    .getByPlaceholder("Winery preferences or anything not shown in the Studio")
    .fill("Prefer Quinta do Piloto and a vegetarian lunch.");

  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await expect(page.getByTestId("studio-v3-checkout-summary")).toBeVisible();
  await expect(page.getByTestId("studio-v3-checkout-summary-stops")).toBeVisible();
});

test("the former Living Atlas preview resolves to the canonical public Studio", async ({
  page,
}) => {
  await page.goto("/studio-living-atlas-preview?source=qa");
  await expect(page).toHaveURL(/\/studio-v3\?source=qa$/);
  await waitForLivingAtlasHydration(page);
  await expect(page.getByText("YES Experience Studio", { exact: true })).toBeVisible();
});
