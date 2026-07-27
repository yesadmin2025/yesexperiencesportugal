import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 812 },
  { name: "iphone-pro", width: 393, height: 852 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
  { name: "desktop-xl", width: 1920, height: 1080 },
];

async function open(page: Page) {
  await page.goto("/corporate", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
}

test.describe("/corporate structure", () => {
  test("single H1 with corporate positioning", async ({ page }) => {
    await open(page);
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("Corporate experiences in Portugal");
  });

  test("scale and reach are stated in the hero", async ({ page }) => {
    await open(page);
    const hero = page.locator("section").first();
    await expect(hero).toContainText("across Portugal");
    await expect(hero).toContainText("100+");
  });

  test("large corporate groups appear outside the FAQ", async ({ page }) => {
    await open(page);
    const card = page.getByRole("heading", { name: "Large corporate groups", level: 3 });
    await expect(card).toBeVisible();
  });

  test("all corporate formats are represented", async ({ page }) => {
    await open(page);
    for (const title of [
      "Team building",
      "Incentive programmes",
      "Corporate retreats",
      "Executive off-sites",
      "Client hosting & VIP",
      "Large corporate groups",
    ]) {
      await expect(page.getByRole("heading", { name: title, level: 3 })).toBeVisible();
    }
  });

  test("no small-group framing in visible copy", async ({ page }) => {
    await open(page);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).not.toContain("small groups");
    expect(body).toContain("corporate groups of 100+");
  });

  test("FAQ copy is in the initial HTML and the accordion opens", async ({ page }) => {
    const res = await page.goto("/corporate", { waitUntil: "domcontentloaded" });
    const html = (await res!.text()).toLowerCase();
    expect(html).toContain("do you organise team building across portugal?");
    expect(html).toContain("company-wide groups of 100+");

    const trigger = page.getByRole("button", {
      name: "Do you organise team building across Portugal?",
    });
    await trigger.click();
    await expect(page.getByText("adapted to the group's objectives")).toBeVisible();
  });

  test("Service and FAQ JSON-LD are present and valid", async ({ page }) => {
    await open(page);
    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = blobs.map((b) => JSON.parse(b));
    const service = nodes.find((n) => n["@type"] === "Service");
    expect(service).toBeTruthy();
    expect(service.areaServed.name).toBe("Portugal");
    expect(service.provider["@id"]).toContain("#organization");
    const faq = nodes.find((n) => n["@type"] === "FAQPage");
    expect(faq.mainEntity.length).toBe(5);
  });

  test("canonical, hreflang and metadata are consistent", async ({ page }) => {
    await open(page);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://yesexperiencesportugal.com/corporate",
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Corporate Experiences Across Portugal | YES",
    );
    await expect(page.locator('link[hreflang="pt-PT"]')).toHaveAttribute(
      "href",
      "https://yesexperiencesportugal.com/pt/corporate",
    );
    expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBe(0);
  });

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await open(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
