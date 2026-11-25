import { test, expect, type Locator } from "@playwright/test";

/** Verify canonical arrows and keyboard focus on the actual service CTAs. */
const paths = [
  ["#signatures", "/experiences"],
  ["#builder", "/studio"],
  ["#multi-day", "/portugal-travel-designer"],
  ["#special-occasions", "/proposal-in-portugal"],
  ["#special-occasions", "/corporate"],
] as const;
const GOLD = "rgb(201, 169, 106)";
async function assertArrow(card: Locator) {
  const svg = card.locator("svg.cta-arrow-cue").first();
  await expect(svg).toBeVisible();
  await expect(svg).toHaveCSS("color", GOLD);
  await expect(svg).toHaveAttribute("stroke", "currentColor");
  const strokes = await svg.locator("path, line, polyline").evaluateAll(nodes => nodes.map(node => getComputedStyle(node).stroke));
  expect(strokes.length).toBeGreaterThan(0);
  expect(strokes.every(stroke => stroke === GOLD)).toBe(true);
}
test.describe("Homepage real commercial CTA arrow contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await expect(page.locator("#signatures")).toBeVisible();
    await expect(page.locator("[data-home-primary-path]")).toHaveCount(0);
  });
  for (const [section, href] of paths) {
    test(href + " preserves destination, gold arrow and visible keyboard focus", async ({ page }) => {
      const card = page.locator(`${section} a[href="${href}"]`).filter({ has: page.locator("svg.cta-arrow-cue") }).first();
      await expect(card).toHaveAttribute("href", href);
      await card.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await assertArrow(card);
      await card.hover();
      await assertArrow(card);
      await page.keyboard.press("Tab");
      await card.focus();
      await expect(card).toBeFocused();
      await expect.poll(() => card.evaluate(el => {
        const css = getComputedStyle(el);
        return (css.outlineStyle !== "none" && parseFloat(css.outlineWidth) > 0) || css.boxShadow !== "none";
      })).toBe(true);
      await assertArrow(card);
    });
  }
});
