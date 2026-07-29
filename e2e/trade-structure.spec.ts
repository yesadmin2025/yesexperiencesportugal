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
  test.beforeEach(async ({ context }) => {
    // Dismiss the cookie banner so it never overlays the controls under test.
    await context.addCookies([
      {
        name: "yes.cookieConsent.v1",
        value: "1",
        url: "http://localhost:8080",
      },
    ]);
    await context.addInitScript(() => {
      window.localStorage.setItem(
        "yes.cookieConsent.v1",
        JSON.stringify({ analytics: false, ts: Date.now() }),
      );
    });
  });

  test("hero, services, book and FAQ render with no banned copy", async ({ page }) => {
    await page.goto("/trade");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your clients’ Portugal");
    const text = await bodyText(page);
    for (const phrase of BANNED) expect(text).not.toContain(phrase.toLowerCase());

    const services = page.locator("#trade-services");
    for (const label of [
      "Signature Experiences",
      "Experience Studio",
      "Travel Designer",
      "Moments",
      "Corporate & Private Groups",
    ]) {
      await expect(services.getByRole("heading", { name: label, exact: true })).toBeVisible();
    }

    await expect(page.locator("#sample-journey")).toBeVisible();
  });

  test("FAQ accordion opens and states nationwide reach", async ({ page }) => {
    await page.goto("/trade");
    const trigger = page.getByRole("button", { name: /Where in Portugal can you operate/i });
    // Retry until React has hydrated the accordion.
    await expect(async () => {
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
    }).toPass({ timeout: 15000 });
    await expect(page.getByText(/We operate across Portugal/i)).toBeVisible();
  });

  test("form validates and keeps entered values", async ({ page }) => {
    await page.goto("/trade");
    const submit = page.locator('#trade-inquiry button[type="submit"]');
    const error = page.getByText(/Please check the highlighted fields/i);
    await expect(async () => {
      await page.locator("#trade-first").fill("Ana");
      await submit.click();
      await expect(error).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
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
