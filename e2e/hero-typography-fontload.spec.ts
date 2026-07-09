/**
 * Hero typography — explicit, self-contained assertions that run AFTER
 * web fonts have finished loading. Complements `hero-typography-metrics`
 * (which compares against a JSON baseline) by hard-coding the approved
 * brand contract so a future baseline regeneration cannot silently
 * drift away from canon:
 *
 *   • eyebrow        → Inter,      tracked, uppercase via tracking
 *   • headline L1    → Montserrat, weight 400, font-style: normal
 *   • headline L2    → Georgia,    weight 400, font-style: italic, gold
 *   • subheadline    → Inter,      generous leading (≥ 1.6)
 *   • microcopy      → Inter,      tracked
 *
 * Scale assertions are clamped to *ranges* (not single px values) so
 * the test survives sub-pixel rounding across CI runners but fails on
 * any meaningful regression — including the "headline shrunk on mobile"
 * class of bug. Mobile (393px Pixel-5) is asserted explicitly.
 */

import { test, expect, type Page } from "@playwright/test";

type Computed = {
  fontFamily: string;
  primaryFamily: string;
  fontWeight: string;
  fontStyle: string;
  fontSizePx: number;
  lineHeightPx: number;
  lineHeightRatio: number;
  letterSpacingEm: number;
  color: string;
};

async function waitForFontsAndHero(page: Page) {
  await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
  await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
  await page.locator('[data-hero-field="headlineLine1"]:not(h1)').waitFor({ state: "visible" });

  // Block until web fonts (Montserrat / Georgia / Inter) actually
  // finish loading — otherwise computed font-size/line-height reflect
  // the fallback metric and the assertions below are meaningless.
  await page.evaluate(async () => {
    type FontFaceSetLike = {
      ready?: Promise<unknown>;
      check?: (font: string) => boolean;
    };
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (fonts?.ready) await fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });

  // Sanity: required font faces are actually loaded in the browser.
  const fontStatus = await page.evaluate(() => {
    type FontFaceSetLike = { check?: (font: string) => boolean };
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (!fonts?.check) return { montserrat: true, inter: true, georgia: true };
    return {
      montserrat: fonts.check('400 16px "Montserrat"'),
      inter: fonts.check('400 16px "Inter"'),
      georgia: fonts.check("italic 400 16px Georgia"),
    };
  });
  expect(fontStatus.montserrat, "Montserrat 400 not loaded").toBe(true);
  expect(fontStatus.inter, "Inter 400 not loaded").toBe(true);
  // Georgia ships with the OS — `check()` should always be true; we
  // don't fail the run if a headless image lacks it, only log.
  if (!fontStatus.georgia)
    console.warn(
      "[hero-typography-fontload] Georgia not reported by document.fonts — italic line will use serif fallback",
    );
}

async function readComputed(page: Page, selector: string): Promise<Computed> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`element not found: ${sel}`);
    const cs = window.getComputedStyle(el);
    const fontSizePx = parseFloat(cs.fontSize);
    const lineHeightPx = cs.lineHeight === "normal" ? fontSizePx * 1.2 : parseFloat(cs.lineHeight);
    const ls = cs.letterSpacing;
    let letterSpacingEm = 0;
    if (ls && ls !== "normal") {
      const lsPx = parseFloat(ls);
      if (!Number.isNaN(lsPx) && fontSizePx > 0) letterSpacingEm = lsPx / fontSizePx;
    }
    const stack = cs.fontFamily ?? "";
    const primary = (stack.split(",")[0] ?? "")
      .replace(/^["']|["']$/g, "")
      .trim()
      .toLowerCase();
    return {
      fontFamily: stack,
      primaryFamily: primary,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      fontSizePx,
      lineHeightPx,
      lineHeightRatio: fontSizePx > 0 ? lineHeightPx / fontSizePx : 0,
      letterSpacingEm,
      color: cs.color,
    } satisfies Computed;
  }, selector);
}

test.describe("Hero typography — font families & scale (post font load)", () => {
  test("applies the approved font stack and scale", async ({ page }, testInfo) => {
    await waitForFontsAndHero(page);

    const isMobile = testInfo.project.name === "mobile-chromium";

    const eyebrow = await readComputed(page, '[data-hero-field="eyebrow"]');
    const line1 = await readComputed(page, '[data-hero-field="headlineLine1"]:not(h1)');
    const line2 = await readComputed(page, '[data-hero-field="headlineLine2"]');
    const sub = await readComputed(page, '[data-hero-field="subheadline"]');
    const micro = await readComputed(page, '[data-hero-field="microcopy"]');

    // Attach the captured snapshot for debugging on failure.
    await testInfo.attach(`hero-typography-fontload-${testInfo.project.name}.json`, {
      body: JSON.stringify({ eyebrow, line1, line2, sub, micro }, null, 2),
      contentType: "application/json",
    });

    // ── Eyebrow — Inter, tracked, normal style ────────────────────────
    expect(eyebrow.primaryFamily, "eyebrow font-family").toBe("inter");
    expect(eyebrow.fontStyle, "eyebrow font-style").toBe("normal");
    expect(eyebrow.letterSpacingEm, "eyebrow tracking").toBeGreaterThan(0.1);

    // ── Headline line 1 — Montserrat, 400, NOT italic, ivory ──────────
    expect(line1.primaryFamily, "headline L1 font-family").toBe("montserrat");
    expect(line1.fontWeight, "headline L1 weight").toBe("400");
    expect(line1.fontStyle, "headline L1 style").toBe("normal");
    // line-height ratio between 1.0 and 1.12 — premium editorial leading
    expect(line1.lineHeightRatio).toBeGreaterThanOrEqual(0.98);
    expect(line1.lineHeightRatio).toBeLessThanOrEqual(1.14);
    // tracking is near-zero (-0.005em design tightening allowed)
    expect(Math.abs(line1.letterSpacingEm)).toBeLessThan(0.012);

    // Mobile-specific scale: 2.125rem = 34px (Tailwind base 16px). Allow
    // ±1.5px so an OS that reports rem differently doesn't false-fail.
    if (isMobile) {
      // 2.125rem = 34px on mobile (Pixel 5, base; sm kicks in at 640px).
      expect(line1.fontSizePx, "headline L1 mobile size").toBeGreaterThanOrEqual(32.5);
      expect(line1.fontSizePx, "headline L1 mobile size").toBeLessThanOrEqual(35.5);
    } else {
      // Desktop (≥1024px) → 4.75rem = 76px. Tablet ≥768px → 4rem = 64px.
      expect(line1.fontSizePx, "headline L1 desktop size").toBeGreaterThanOrEqual(60);
      expect(line1.fontSizePx, "headline L1 desktop size").toBeLessThanOrEqual(80);
    }

    // ── Headline line 2 — Georgia, italic, weight 400, gold-soft ──────
    expect(line2.primaryFamily, "headline L2 font-family").toBe("georgia");
    expect(line2.fontStyle, "headline L2 must be italic").toBe("italic");
    expect(line2.fontWeight, "headline L2 weight").toBe("400");
    // Inherits scale from h1 — assert it matches line 1 within 1px.
    expect(
      Math.abs(line2.fontSizePx - line1.fontSizePx),
      "L2 size should match L1",
    ).toBeLessThanOrEqual(1.5);
    // Color sanity: gold-soft ≈ #E1CFA6 → R>G>B and clearly not ivory.
    const m = line2.color.match(/\d+/g)?.map(Number) ?? [];
    expect(m.length, "L2 color parseable").toBeGreaterThanOrEqual(3);
    const [r, g, b] = m;
    expect(r, "gold R > G").toBeGreaterThan(g);
    expect(g, "gold G > B").toBeGreaterThan(b);

    // ── Subheadline — Inter, generous leading ────────────────────────
    expect(sub.primaryFamily, "subheadline font-family").toBe("inter");
    expect(sub.fontStyle, "subheadline style").toBe("normal");
    // 14.5px on mobile, 17–18px elsewhere
    if (isMobile) {
      expect(sub.fontSizePx).toBeGreaterThanOrEqual(13.5);
      expect(sub.fontSizePx).toBeLessThanOrEqual(15.5);
    } else {
      expect(sub.fontSizePx).toBeGreaterThanOrEqual(16);
      expect(sub.fontSizePx).toBeLessThanOrEqual(19);
    }
    // Body leading ≥ 1.6 — premium editorial rhythm
    expect(sub.lineHeightRatio, "subheadline leading").toBeGreaterThanOrEqual(1.6);
    expect(sub.lineHeightRatio, "subheadline leading").toBeLessThanOrEqual(1.85);

    // ── Microcopy — Inter, tracked ─────────────────────────────────────
    expect(micro.primaryFamily, "microcopy font-family").toBe("inter");
    expect(micro.letterSpacingEm, "microcopy tracking").toBeGreaterThanOrEqual(0.03);
  });
});
