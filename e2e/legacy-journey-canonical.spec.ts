import { test, expect } from "@playwright/test";

test("legacy multi-day URL redirects directly and permanently", async ({ request }) => {
  const response = await request.get("/multi-day?source=qa", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe(
    "https://yesexperiencesportugal.com/portugal-travel-designer?source=qa",
  );
  expect(await response.text()).not.toContain('rel="canonical"');
});

test("Travel Designer is self-canonical and public links skip the legacy URL", async ({ page }) => {
  await page.goto("/portugal-travel-designer", { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://yesexperiencesportugal.com/portugal-travel-designer",
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await page.locator('a[href="/multi-day"], a[href="/studio-v3"]').count()).toBe(0);
});