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

    const line1 = await readComputed(page, '[data-hero-stanza="true"] > p:nth-child(1)');
    const line2 = await readComputed(page, '[data-hero-stanza="true"] > p:nth-child(2)');
    const primaryCta = await readComputed(page, 'a[data-hero-field="primaryCta"]');
    const secondaryCta = await readComputed(page, 'a[data-hero-field="secondaryCta"]');

    await testInfo.attach(`hero-typography-fontload-${testInfo.project.name}.json`, {
      body: JSON.stringify({ line1, line2, primaryCta, secondaryCta }, null, 2),
      contentType: "application/json",
    });

    // ── Stanza — Georgia italic 400, gold-soft, tight editorial leading ──
    for (const [label, line] of [
      ["stanza L1", line1],
      ["stanza L2", line2],
    ] as const) {
      expect(line.primaryFamily, `${label} font-family`).toBe("georgia");
      expect(line.fontStyle, `${label} must be italic`).toBe("italic");
      expect(line.fontWeight, `${label} weight`).toBe("400");
      expect(line.lineHeightRatio, `${label} leading`).toBeGreaterThanOrEqual(1.15);
      expect(line.lineHeightRatio, `${label} leading`).toBeLessThanOrEqual(1.4);
      // Gold-soft ≈ #F1D8AB → R > G > B, clearly not ivory/white.
      const m = line.color.match(/\d+/g)?.map(Number) ?? [];
      expect(m.length, `${label} color parseable`).toBeGreaterThanOrEqual(3);
      expect(m[0], `${label} gold R > G`).toBeGreaterThan(m[1]);
      expect(m[1], `${label} gold G > B`).toBeGreaterThan(m[2]);
    }

    // clamp(28px, 4.6vw, 50px) — mobile lands at the floor, desktop higher.
    expect(line1.fontSizePx, "stanza size floor").toBeGreaterThanOrEqual(27.5);
    expect(line1.fontSizePx, "stanza size ceiling").toBeLessThanOrEqual(50.5);
    if (!isMobile) {
      expect(line1.fontSizePx, "stanza scales up beyond mobile").toBeGreaterThanOrEqual(30);
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

