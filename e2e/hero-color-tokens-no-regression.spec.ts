/**
 * Hero color tokens — non-regression guard (v4 "One Breath").
 *
 * The pre-v4 hero painted an eyebrow, an ivory headline line and a
 * gold-soft italic line as separate overlay fields. v4 renders a single
 * centered two-line stanza in Georgia italic, gold-soft #F1D8AB, over
 * the held clip. Everything else (eyebrow, subheadline, microcopy) now
 * lives in sr-only probes, which inherit page text color and must not
 * be color-asserted.
 *
 * This spec locks what is actually painted: both stanza lines stay
 * gold-soft serif italic, never drifting to ivory/white or a
 * non-brand hue. Channel tolerance ±10/255 absorbs anti-alias jitter.
 */

import { test, expect } from "@playwright/test";

type RGB = { r: number; g: number; b: number };

const CHANNEL_TOL = 10;
const GOLD_SOFT: RGB = { r: 0xf1, g: 0xd8, b: 0xab };

function parseColor(input: string): RGB {
  const m = input.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)/i);
  if (!m) throw new Error(`Unparseable color: "${input}"`);
  return { r: +m[1], g: +m[2], b: +m[3] };
}

function within(a: RGB, b: RGB, tol = CHANNEL_TOL): boolean {
  return Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
}

function fmt(c: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `rgb(${c.r},${c.g},${c.b}) / #${h(c.r)}${h(c.g)}${h(c.b)}`;
}

test.describe("Hero color tokens — non-regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
    await page.evaluate(async () => {
      type FF = { ready?: Promise<unknown> };
      const f = (document as unknown as { fonts?: FF }).fonts;
      if (f?.ready) await f.ready;
    });
  });

  test("both stanza lines stay gold-soft #F1D8AB, serif italic 400", async ({ page }) => {
    const lines = page.locator('[data-hero-stanza="true"] > p');
    await expect(lines).toHaveCount(2);

    for (let i = 0; i < 2; i += 1) {
      const style = await lines.nth(i).evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          color: cs.color,
          fontStyle: cs.fontStyle,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily.toLowerCase(),
        };
      });
      const actual = parseColor(style.color);
      expect(
        within(actual, GOLD_SOFT),
        `Stanza line ${i + 1} drifted: got ${fmt(actual)}, expected ${fmt(GOLD_SOFT)}`,
      ).toBe(true);
      expect(style.fontStyle, `stanza line ${i + 1} must remain italic`).toBe("italic");
      expect(style.fontWeight, `stanza line ${i + 1} must stay weight 400`).toBe("400");
      expect(style.fontFamily, `stanza line ${i + 1} must use the serif token`).toContain("georgia");
    }
  });
});
