/**
 * Hero typography — screenshot-based visual regression.
 *
 * Locks the rendered pixels of the hero copy block (eyebrow, headline
 * L1 + L2, subheadline) AFTER web fonts have loaded and reveals are
 * frozen at their final state via `?hero=last`.
 *
 * This complements the metric / token / fontload specs: those catch
 * declarative drift (family, weight, size); this catches everything
 * else — anti-alias, kerning shifts, italic glyph swaps, color tone,
 * gradient bleed-through behind the copy.
 *
 * Baselines live at:
 *   e2e/hero-typography-visual.spec.ts-snapshots/<name>-<project>.png
 *
 * To regenerate after an *intentional* design change:
 *   bunx playwright test hero-typography-visual --update-snapshots
 *
 * Threshold is intentionally tight (maxDiffPixelRatio 0.012, ~1.2%) so
 * a real regression — Portugal losing italic gold, headline losing
 * Montserrat, leading collapsing — fails the run, but normal sub-pixel
 * jitter from a different headless build does not.
 */

import { test, expect, type Page } from "@playwright/test";

async function prepHero(page: Page) {
  await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
  await page.locator('[data-hero-field="headlineLine1"]:not(h1)').waitFor({ state: "visible" });

  // Mask the background film — its frames are non-deterministic and
  // would dominate any pixel diff. We screenshot the copy column only.
  await page.evaluate(async () => {
    type FontFaceSetLike = { ready?: Promise<unknown> };
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (fonts?.ready) await fonts.ready;
    const video = document.querySelector('[data-hero-film="true"]') as HTMLVideoElement | null;
    if (video) {
      try {
        video.pause();
      } catch {
        /* noop */
      }
      video.style.visibility = "hidden";
    }
    document.querySelectorAll('[data-hero-cinematic="true"] [aria-hidden="true"]').forEach((el) => {
      (el as HTMLElement).style.visibility = "hidden";
    });
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}

async function captureHeroRegion(page: Page) {
  const region = await page.evaluate(() => {
    const eb = document.querySelector('[data-hero-field="eyebrow"]') as HTMLElement | null;
    const sh = document.querySelector('[data-hero-field="subheadline"]') as HTMLElement | null;
    if (!eb || !sh) throw new Error("hero copy bounds not found");
    const a = eb.getBoundingClientRect();
    const b = sh.getBoundingClientRect();
    const left = Math.floor(Math.min(a.left, b.left)) - 4;
    const right = Math.ceil(Math.max(a.right, b.right)) + 4;
    const top = Math.floor(a.top) - 4;
    const bottom = Math.ceil(b.bottom) + 4;
    return {
      x: Math.max(0, left),
      y: Math.max(0, top),
      width: right - left,
      height: bottom - top,
    };
  });

  expect(region.width).toBeGreaterThan(120);
  expect(region.height).toBeGreaterThan(120);

  return page.screenshot({
    clip: region,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
}

const SNAPSHOT_OPTIONS = {
  // Tight but resilient: ~1.5% of pixels can differ, each by up to a
  // moderate per-channel delta. A Portugal-italic regression or a font
  // swap is far above this floor; sub-pixel jitter across runners isn't.
  maxDiffPixelRatio: 0.015,
  threshold: 0.2,
} as const;

test.describe("Hero typography — screenshot visual regression", () => {
  // ── Normal motion: revealed via ?hero=last (final state, no animation) ──
  test("normal motion · eyebrow + headline + subheadline match approved snapshot", async ({
    page,
  }, testInfo) => {
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await prepHero(page);
    const buf = await captureHeroRegion(page);
    await expect(buf).toMatchSnapshot(
      [`hero-typography-${testInfo.project.name}.png`],
      SNAPSHOT_OPTIONS,
    );
  });

  // ── Reduced motion: emulated via prefers-reduced-motion=reduce ──
  // The component initialises every reveal to its end-state when the
  // user prefers reduced motion, so no `?hero=last` flag is needed.
  // This snapshot guards against motion-disabled regressions where a
  // reveal class accidentally leaves the headline at opacity 0 or
  // translated off-screen for users with reduced-motion enabled.
  test.describe("reduced motion", () => {
    test.use({ colorScheme: "dark", reducedMotion: "reduce" });

    test("reduced motion · eyebrow + headline + subheadline match approved snapshot", async ({
      page,
    }, testInfo) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await prepHero(page);
      const buf = await captureHeroRegion(page);
      await expect(buf).toMatchSnapshot(
        [`hero-typography-reduced-motion-${testInfo.project.name}.png`],
        SNAPSHOT_OPTIONS,
      );
    });
  });
});
