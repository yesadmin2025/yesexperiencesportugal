/**
 * Hero fields visibility — non-regression.
 *
 * Guards the bug where legacy mobile keyframe rules in src/styles.css
 * (`@media (max-width: 767px) [data-hero-field="headlineLine1"] { opacity: 0 }`
 * and the matching headlineLine2 rule) silently kept the cinematic H1
 * invisible after React flipped showLine1/showLine2 to true. Without
 * the .hero-cinematic-scoped `opacity: revert !important` override,
 * mobile users see only the eyebrow + final block — the headline is
 * blank between them.
 *
 * Contract: with `?hero=last` (every reveal forced to its end-state),
 * every hero text field must report computed `opacity: 1`.
 */
import { test, expect } from "@playwright/test";

const FIELDS = [
  '[data-hero-field="eyebrow"]',
  '[data-hero-field="headlineLine1"]:not(h1)',
  '[data-hero-field="headlineLine2"]',
  '[data-hero-field="subheadline"]',
];

test.describe("Hero fields visibility — no opacity:0 regressions", () => {
  test("every hero copy field is fully opaque on the final beat", async ({ page }) => {
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
    await page.evaluate(async () => {
      type FF = { ready?: Promise<unknown> };
      const f = (document as unknown as { fonts?: FF }).fonts;
      if (f?.ready) await f.ready;
    });

    for (const sel of FIELDS) {
      const opacity = await page.evaluate((s) => {
        const el = document.querySelector(s) as HTMLElement | null;
        if (!el) throw new Error(`not found: ${s}`);
        return parseFloat(window.getComputedStyle(el).opacity || "0");
      }, sel);
      expect(opacity, `${sel} must be fully opaque on final beat, got opacity=${opacity}`).toBe(1);
    }
  });
});
