import { expect, test } from "@playwright/test";

const canonicalHref = (path: string) => `https://yesexperiencesportugal.com${path}`;

async function robotsContent(page: import("@playwright/test").Page) {
  return (await page.locator('meta[name="robots"]').getAttribute("content"))?.toLowerCase() ?? "";
}

test.describe("SEO conversion and index-quality guardrails", () => {
  test("10-day Travel Designer sample is substantive, indexable and self-canonical", async ({ page }) => {
    const path = "/itineraries/10-day-private-portugal-tour";
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalHref(path));
    expect(await robotsContent(page)).not.toContain("noindex");
    await expect(page.locator("h1")).toContainText("Portugal");
    await expect(page.getByText(/sample shape/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /work with a travel designer/i })).toBeVisible();
    await expect(page.getByText(/Is this a fixed 10-day package I can book as shown\?/i)).toBeVisible();
  });

  test("Azeitão commercial tour stays indexable and exposes canonical full-day truth", async ({ page }) => {
    const path = "/tours/azeitao-cheese";
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalHref(path));
    expect(await robotsContent(page)).not.toContain("noindex");
    await expect(page.locator("h1")).toContainText(/Azeitão|Cheese|Wine/i);
    await expect(page.getByText(/full private 8–9 hour day from Lisbon/i)).toBeVisible();
    await expect(page.getByText(/hands-on Azeitão cheese-making workshop/i).first()).toBeVisible();
  });

  test("Portuguese contact soft-404 target is deliberately utility noindex", async ({ page }) => {
    const path = "/pt/contact";
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalHref(path));
    expect(await robotsContent(page)).toContain("noindex");
    expect(await robotsContent(page)).toContain("follow");
    await expect(page.locator("h1")).toBeVisible();
  });

  for (const path of ["/privacy", "/pt/privacy", "/cookies", "/pt/cookies"]) {
    test(`${path} is a crawlable utility page outside the search index`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalHref(path));
      expect(await robotsContent(page)).toContain("noindex");
      expect(await robotsContent(page)).toContain("follow");
      await expect(page.locator("h1")).toBeVisible();
    });
  }

  for (const path of ["/reviews", "/pt/reviews"]) {
    test(`${path} remains a substantive indexable trust landing page`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalHref(path));
      expect(await robotsContent(page)).not.toContain("noindex");
      await expect(page.locator("h1")).toBeVisible();
    });
  }

  test("Tailor pages keep their intentional noindex guard", async ({ page }) => {
    const response = await page.goto("/tours/arrabida-wine-allinclusive/tailor");
    expect(response?.status()).toBe(200);
    expect(await robotsContent(page)).toContain("noindex");
  });
});
