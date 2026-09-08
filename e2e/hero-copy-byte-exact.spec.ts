import { test, expect, type Page } from "@playwright/test";
import { HERO_COPY_SPEC } from "../src/content/hero-copy.spec";

/**
 * Byte-for-byte DOM assertion of the home hero copy.
 *
 * Unlike `e2e/hero-copy.spec.ts` (which uses Playwright's text matchers,
 * tolerant of whitespace and surrounding decorations), this spec:
 *
 *  1. Locates each rendered hero field by its `data-hero-field="<key>"`
 *     attribute — the same hook the in-page `HeroVerifyOverlay` uses, so
 *     production verification, dev-time overlay, and CI all check the
 *     SAME nodes.
 *  2. Reads `textContent` (not `innerText` — innerText is layout-aware
 *     and would normalize whitespace) and compares it with `===` against
 *     the FROZEN `HERO_COPY_SPEC`.
 *  3. Reports mismatches with a precise character index + codepoint dump
 *     so the failure message tells you exactly what byte drifted, not
 *     just "expected X to equal Y".
 *
 * If a field is wrapped in decorative siblings (e.g. ✦ glyphs around the
 * eyebrow text), the test asserts on the INNER `data-hero-field` node,
 * which holds only the bare phrase — keeping the assertion immune to
 * presentation flourishes added later.
 */

const FIELDS_TO_CHECK = [
  "eyebrow",
  "headlineLine1",
  "headlineLine2",
  "subheadline",
  "primaryCta",
  "secondaryCta",
] as const satisfies readonly (keyof typeof HERO_COPY_SPEC)[];

async function gotoHero(page: Page) {
  // `?hero=last` freezes the cinematic sequence on the final scene where
  // all approved hero strings are simultaneously rendered, so byte-exact
  // DOM assertions are deterministic.
  await page.goto("/?hero=last");
  // Wait for the headline opacity animation to finish so any
  // animation-driven content swap has settled before we read text.
  const h1 = page.locator("h1.hero-h1");
  await expect(h1).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector("h1.hero-h1") as HTMLElement | null;
    return !!el && getComputedStyle(el).opacity === "1";
  });
}

/**
 * Pretty-print the first byte that differs between `actual` and `expected`
 * so a failing assertion immediately points at the offending character —
 * a leading space, a smart quote, the wrong em-dash, etc.
 */
function describeFirstDiff(actual: string, expected: string): string {
  const max = Math.max(actual.length, expected.length);
  for (let i = 0; i < max; i++) {
    const a = actual.charCodeAt(i);
    const e = expected.charCodeAt(i);
    if (a !== e) {
      const fmt = (cp: number) =>
        Number.isNaN(cp)
          ? "<EOF>"
          : `U+${cp.toString(16).padStart(4, "0").toUpperCase()} (${JSON.stringify(
              String.fromCharCode(cp),
            )})`;
      return `first divergence at index ${i}: ` + `actual=${fmt(a)} vs expected=${fmt(e)}`;
    }
  }
  return "no character-level divergence (lengths differ at end)";
}

test.describe("Hero — byte-exact DOM copy lock", () => {
  for (const key of FIELDS_TO_CHECK) {
    test(`data-hero-field="${key}" textContent equals HERO_COPY_SPEC.${key}`, async ({ page }) => {
      await gotoHero(page);

      // Resolve the *innermost* node carrying this exact key. The
      // headline wrapper has a space-separated list ("headlineLine1
      // headlineLine2") and we want the per-line spans, not the parent.
      const node = page.locator(`[data-hero-field="${key}"]`);
      await expect(
        node,
        `expected exactly one [data-hero-field="${key}"] node in the DOM`,
      ).toHaveCount(1);

      const actual = (await node.evaluate((el) => (el as HTMLElement).textContent ?? "")) as string;
      const expected = HERO_COPY_SPEC[key];

      expect(
        actual,
        `hero field "${key}" drifted from approved spec — ${describeFirstDiff(actual, expected)}\n` +
          `  expected (${expected.length} chars): ${JSON.stringify(expected)}\n` +
          `  actual   (${actual.length} chars): ${JSON.stringify(actual)}`,
      ).toBe(expected);
    });
  }

});
