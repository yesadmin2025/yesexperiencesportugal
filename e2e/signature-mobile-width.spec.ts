import { test, expect } from "@playwright/test";

const widths = [320, 360, 393] as const;
const routes = ["/experiences", "/pt/experiences"] as const;

async function expectInsideViewport(
  locator: import("@playwright/test").Locator,
  viewportWidth: number,
) {
  const boxes = await locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
  );

  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(viewportWidth + 1);
    expect(box.width).toBeLessThanOrEqual(viewportWidth);
  }
}

for (const width of widths) {
  for (const route of routes) {
    test(`${route} stays within ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const grid = page.getByTestId("signature-collection-grid");
      await expect(grid).toBeVisible();
      await expectInsideViewport(page.getByTestId("signature-tour-card"), width);
      await expectInsideViewport(
        page.getByTestId("signature-tour-card").locator("a"),
        width,
      );

      const documentWidths = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(documentWidths.html).toBeLessThanOrEqual(documentWidths.viewport);
      expect(documentWidths.body).toBeLessThanOrEqual(documentWidths.viewport);
    });
  }
}

test("collection to Signature detail remains left-aligned at 393px", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 588 });
  await page.goto("/experiences", { waitUntil: "domcontentloaded" });

  const firstCard = page.getByTestId("signature-tour-card").first();
  await firstCard.locator("a").first().click();
  await expect(page).toHaveURL(/\/tours\/arrabida-wine-allinclusive$/);
  await expect(page.locator("h1")).toBeVisible();

  const layout = await page.evaluate(() => ({
    scrollX: window.scrollX,
    viewport: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(layout.scrollX).toBe(0);
  expect(layout.html).toBeLessThanOrEqual(layout.viewport);
  expect(layout.body).toBeLessThanOrEqual(layout.viewport);

  await expectInsideViewport(page.locator("h1"), 393);
  await expectInsideViewport(page.locator("main a[href='#book']").first(), 393);
});