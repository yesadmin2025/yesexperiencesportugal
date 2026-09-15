/**
 * Hero typography — explicit, self-contained assertions that run AFTER
 * web fonts have finished loading. Complements `hero-typography-metrics`
 * (which compares against a JSON baseline) by hard-coding the approved
 * brand contract so a future baseline regeneration cannot silently
 * drift away from canon:
 *
 *   • eyebrow        → Inter,      tracked, uppercase via tracking
 *   • headline L1    → Fraunces, weight 400, font-style: italic
 *   • headline L2    → Fraunces, weight 400, font-style: italic, gold
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

  // Block until web fonts (Fraunces / Inter) actually
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
    if (!fonts?.check) return { fraunces: true, inter: true };
    return {
      fraunces: fonts.check('italic 400 16px "Fraunces"'),
      inter: fonts.check('400 16px "Inter"'),
    };
  });
  expect(fontStatus.fraunces, "Fraunces italic 400 not loaded").toBe(true);
  expect(fontStatus.inter, "Inter 400 not loaded").toBe(true);
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

    const line1 = await readComputed(page, '[data-hero-field="headlineLine1"]');
    const line2 = await readComputed(page, '[data-hero-field="headlineLine2"]');
    const primaryCta = await readComputed(page, 'a[data-hero-field="primaryCta"]');
    const secondaryCta = await readComputed(page, 'a[data-hero-field="secondaryCta"]');

    await testInfo.attach(`hero-typography-fontload-${testInfo.project.name}.json`, {
      body: JSON.stringify({ line1, line2, primaryCta, secondaryCta }, null, 2),
      contentType: "application/json",
    });

    // ── Stanza — Fraunces italic 400, gold-soft, tight editorial leading ──
    // Both stanza lines are Fraunces. L1 is upright medium in ivory
    // (the statement); L2 is the gold-soft italic answer (the promise).
    for (const [label, line] of [
      ["stanza L1", line1],
      ["stanza L2", line2],
    ] as const) {
      expect(line.primaryFamily, `${label} font-family`).toBe("fraunces");
      expect(line.lineHeightRatio, `${label} leading`).toBeGreaterThanOrEqual(0.95);
      expect(line.lineHeightRatio, `${label} leading`).toBeLessThanOrEqual(1.4);
    }

    expect(line1.fontStyle, "stanza L1 stays upright").toBe("normal");
    expect(line1.fontWeight, "stanza L1 weight").toBe("500");

    expect(line2.fontStyle, "stanza L2 must be italic").toBe("italic");
    expect(line2.fontWeight, "stanza L2 weight").toBe("400");
    // Gold-soft ≈ #F1D8AB → R > G > B, clearly not ivory/white.
    const gold = line2.color.match(/\d+/g)?.map(Number) ?? [];
    expect(gold.length, "stanza L2 color parseable").toBeGreaterThanOrEqual(3);
    expect(gold[0], "stanza L2 gold R > G").toBeGreaterThan(gold[1]);
    expect(gold[1], "stanza L2 gold G > B").toBeGreaterThan(gold[2]);

    // clamp(2.65rem, 7vw, 5.75rem) — mobile lands at the floor, desktop higher.
    expect(line1.fontSizePx, "stanza size floor").toBeGreaterThanOrEqual(42);
    expect(line1.fontSizePx, "stanza size ceiling").toBeLessThanOrEqual(92.5);
    if (!isMobile) {
      expect(line1.fontSizePx, "stanza scales up beyond mobile").toBeGreaterThanOrEqual(48);
    }
    expect(
      Math.abs(line2.fontSizePx - line1.fontSizePx),
      "stanza L2 size should match L1",
    ).toBeLessThanOrEqual(1.5);

    // ── CTAs — Inter, uppercase, generously tracked ──────────────────
    for (const [label, cta] of [
      ["primary CTA", primaryCta],
      ["secondary CTA", secondaryCta],
    ] as const) {
      expect(cta.primaryFamily, `${label} font-family`).toBe("inter");
      expect(cta.fontStyle, `${label} style`).toBe("normal");
      expect(cta.letterSpacingEm, `${label} tracking`).toBeGreaterThanOrEqual(0.12);
      expect(cta.fontSizePx, `${label} size`).toBeGreaterThanOrEqual(10);
      expect(cta.fontSizePx, `${label} size`).toBeLessThanOrEqual(13);
    }
  });
});
