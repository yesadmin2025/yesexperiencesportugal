import { test, expect, type Locator } from "@playwright/test";

/** The former final CTA was intentionally retired. Its replacement is the
 * five-service decision navigation. Verify every real conversion arrow,
 * preserving exact paint, SVG inheritance, keyboard focus and route checks.
 */
const paths = [
  ["signature", "/experiences"],
  ["studio", "/studio"],
  ["designer", "/portugal-travel-designer"],
  ["proposals", "/proposal-in-portugal"],
  ["corporate", "/corporate"],
] as const;
const GOLD = "rgb(201, 169, 106)";
async function assertArrow(card: Locator) {
  const svg = card.locator(".five-ways-action svg.cta-arrow-cue");
  await expect(svg).toBeVisible();
  await expect(svg).toHaveCSS("color", GOLD);
  await expect(svg).toHaveAttribute("stroke", "currentColor");
  const strokes = await svg.locator("path, line, polyline").evaluateAll(nodes =>
    nodes.map(node => getComputedStyle(node).stroke));
  expect(strokes.length).toBeGreaterThan(0);
  expect(strokes.every(stroke => stroke === GOLD)).toBe(true);
}

test.describe("Homepage decision CTA arrow contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await expect(page.locator("#five-paths")).toBeVisible();
    await expect(page.locator("#five-paths [data-home-primary-path]")).toHaveCount(5);
    await expect(page.locator("#final-cta")).toHaveCount(0);
  });
  for (const [id, href] of paths) {
    test(id + " preserves destination, gold arrow and visible keyboard focus", async ({ page }) => {
      const card = page.locator('#five-paths [data-home-primary-path="' + id + '"]');
      await expect(card).toHaveAttribute("href", href);
      await card.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await assertArrow(card);
      await card.hover();
      await assertArrow(card);
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      await card.focus();
      await expect(card).toBeFocused();
      await expect(card).toHaveCSS("box-shadow", /rgb\(\s*41\s*,\s*91\s*,\s*97\s*\)/);
      await assertArrow(card);
    });
  }
});
