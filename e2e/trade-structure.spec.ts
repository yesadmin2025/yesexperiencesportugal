import { test, expect, type Page } from "@playwright/test";

const BANNED = [
  "not a marketplace",
  "rebooked third party",
  "OTA queue",
  "call centre",
  "on Lisbon time",
  "off the beaten path",
  "hidden gems",
  "discover like a local",
];

async function bodyText(page: Page) {
  return (await page.locator("body").innerText()).toLowerCase();
}

test.describe("/trade structure", () => {
  test("hero, services, book and FAQ render with no banned copy", async ({ page }) => {
    await page.goto("/trade");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your clients’ Portugal",
    );
    const text = await bodyText(page);
    for (const phrase of BANNED) expect(text).not.toContain(phrase.toLowerCase());
    expect(text).toContain("we operate across portugal");

    for (const label of [
      "Signature Experiences",
      "Experience Studio",
      "Travel Designer",
      "Moments",
      "Corporate & Private Groups",
    ]) {
      await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    }

    await expect(page.locator("#sample-journey")).toBeVisible();
  });

  test("FAQ accordion opens", async ({ page }) => {
    await page.goto("/trade");
    const trigger = page.getByRole("button", { name: /How do you work with travel advisors/i });
    await trigger.click();
    await expect(page.getByText(/Share the client brief, dates, interests/i)).toBeVisible();
  });

  test("form validates and keeps entered values", async ({ page }) => {
    await page.goto("/trade");
    await page.locator("#trade-first").fill("Ana");
    await page.getByRole("button", { name: /request trade access/i }).last().click();
    await expect(page.getByText(/Please check the highlighted fields/i)).toBeVisible();
    await expect(page.locator("#trade-first")).toHaveValue("Ana");
  });

  for (const width of [360, 393, 768, 1280, 1728]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/trade");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
