/**
 * Hero color tokens — non-regression guard.
 *
 * Standalone, fast-running spec re-asserting on every E2E execution that
 * the hero only ever paints with the approved YES brand tokens:
 *
 *   • eyebrow        → gold       #C9A96A
 *   • headlineLine1  → ivory      #FAF8F3   (Montserrat 400, no italic)
 *   • headlineLine2  → gold-soft  #E1CFA6   (Georgia italic 400)
 *
 * The existing `hero-typography-colors.spec.ts` covers a wider surface
 * (debug overlay, opacity, text-shadow). This file is intentionally
 * narrow — one focused regression test per visual contract — so failures
 * point at exactly which token drifted, and the suite stays cheap to
 * include in every run / required-check matrix.
 *
 * Channel tolerance ±10/255 absorbs sub-pixel anti-alias jitter; any
 * drift larger than that fails the build.
 */

import { test, expect, type Page } from "@playwright/test";

type RGB = { r: number; g: number; b: number };

const CHANNEL_TOL = 10;

const TOKENS = {
  gold: { r: 0xc9, g: 0xa9, b: 0x6a },
  ivory: { r: 0xfa, g: 0xf8, b: 0xf3 },
} as const satisfies Record<string, RGB>;

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

async function readField(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`not found: ${sel}`);
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      fontStyle: cs.fontStyle,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
    };
  }, selector);
}

test.describe("Hero color tokens — non-regression", () => {
  test.beforeEach(async ({ page }) => {
    // Freeze on final beat so every reveal target is in its painted end-state.
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
    await page.evaluate(async () => {
      type FF = { ready?: Promise<unknown> };
      const f = (document as unknown as { fonts?: FF }).fonts;
      if (f?.ready) await f.ready;
    });
  });

  test("eyebrow remains brand gold #C9A96A", async ({ page }) => {
    const { color } = await readField(page, '[data-hero-field="eyebrow"]');
    const actual = parseColor(color);
    expect(
      within(actual, TOKENS.gold),
      `Hero eyebrow drifted: got ${fmt(actual)}, expected gold ${fmt(TOKENS.gold)}`,
    ).toBe(true);
  });

  test("headline line 1 remains ivory #FAF8F3, Montserrat 400, upright", async ({ page }) => {
    const field = await readField(page, '[data-hero-field="headlineLine1"]:not(h1)');
    const actual = parseColor(field.color);
    expect(
      within(actual, TOKENS.ivory),
      `Hero headline line 1 drifted: got ${fmt(actual)}, expected ivory ${fmt(TOKENS.ivory)}`,
    ).toBe(true);
    expect(field.fontStyle, "headlineLine1 must NOT be italic").toBe("normal");
    expect(field.fontWeight, "headlineLine1 must stay weight 400").toBe("400");
  });

  test("headline line 2 remains gold-soft #E1CFA6, Georgia italic 400", async ({ page }) => {
    const field = await readField(page, '[data-hero-field="headlineLine2"]');
    const actual = parseColor(field.color);
    expect(
      within(actual, { r: 0xe1, g: 0xcf, b: 0xa6 }),
      `Hero italic line drifted: got ${fmt(actual)}, expected gold-soft rgb(225,207,166) / #e1cfa6`,
    ).toBe(true);
    expect(field.fontStyle, "headlineLine2 must remain italic").toBe("italic");
    expect(field.fontWeight, "headlineLine2 must stay weight 400").toBe("400");
    expect(
      field.fontFamily.toLowerCase(),
      "headlineLine2 must use the Georgia serif italic token",
    ).toContain("georgia");
  });
});
