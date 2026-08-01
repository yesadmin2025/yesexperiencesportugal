/**
 * Hero v4 "One Breath" — reveal contract.
 *
 * Replaces the retired `hero-reveal-cadence` / `hero-mobile-rhythm`
 * specs, which asserted the pre-v4 four-step stagger (eyebrow →
 * headline lines → final block) and the CTA → microcopy → signature
 * rhythm stack. Neither exists in the current hero: v4 holds a single
 * cinematic clip behind one two-line stanza, then reveals two CTAs.
 *
 * What still must not regress:
 *   • both stanza lines render and end fully opaque
 *   • the CTA block composes in (data-hero-composed="true") and becomes
 *     interactive (pointer-events restored)
 *   • both CTAs clear a 44px tap target on every viewport
 */

import { test, expect } from "@playwright/test";
import { HERO_PHRASES } from "../src/content/hero-copy";

test.describe("Hero v4 — one-breath reveal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
  });

  test("both stanza lines settle fully opaque", async ({ page }) => {
    for (const phrase of HERO_PHRASES) {
      const line = page.getByText(phrase, { exact: true }).first();
      await expect(line).toBeVisible();
      await expect
        .poll(async () => line.evaluate((el) => getComputedStyle(el).opacity), { timeout: 10_000 })
        .toBe("1");
    }
  });

  test("CTA block composes in and becomes interactive", async ({ page }) => {
    const block = page.locator("[data-hero-composed]");
    await expect
      .poll(() => block.getAttribute("data-hero-composed"), { timeout: 15_000 })
      .toBe("true");
    await expect
      .poll(() => block.evaluate((el) => getComputedStyle(el).pointerEvents))
      .toBe("auto");
  });

  test("both CTAs clear a 44px tap target", async ({ page }) => {
    for (const field of ["primaryCta", "secondaryCta"]) {
      const cta = page.locator(`a[data-hero-field="${field}"]`);
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box, `${field} must have a box`).not.toBeNull();
      expect(
        Math.round(box!.height),
        `${field} tap target height (got ${box!.height.toFixed(1)}px)`,
      ).toBeGreaterThanOrEqual(44);
    }
  });
});
