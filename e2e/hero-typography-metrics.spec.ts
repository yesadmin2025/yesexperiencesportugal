/**
 * Hero typography metrics — regression test.
 *
 * Captures the *computed* typographic geometry of the hero copy block
 * (eyebrow, H1 line 1, H1 line 2 italic gold, subheadline, microcopy)
 * at both mobile (Pixel 5, ~393px) and desktop (1366px) and compares
 * the result against an approved JSON baseline checked into the repo.
 *
 * Why a metrics test in addition to the pixel-diff hero-visual-regression
 * spec? Pixel diffs catch *what changed visually*; this spec locks the
 * exact things branding cares about — font-family, weight, font-size,
 * line-height (leading), letter-spacing (tracking), block top/bottom
 * positions, vertical rhythm between blocks (baseline gap), and the
 * computed first-line baseline of every text node. A weight or tracking
 * regression that survives a pixel diff (e.g. on a different headless
 * font fallback) still trips this spec.
 *
 * Baseline files live next to the spec at:
 *   e2e/__baselines__/hero-typography-<project>.json
 *
 * To regenerate baselines after an *intentional* design change run:
 *   UPDATE_HERO_TYPO_BASELINE=1 bunx playwright test \
 *     hero-typography-metrics --project=mobile-chromium
 *   UPDATE_HERO_TYPO_BASELINE=1 bunx playwright test \
 *     hero-typography-metrics --project=desktop-chromium
 *
 * Tolerances are tight for declarative properties (font-family / weight /
 * tracking are exact), looser for sub-pixel rendering metrics (sizes /
 * positions ±1.5px) so anti-alias jitter never registers as a fail.
 */

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGETS = [
  { key: "eyebrow", selector: '[data-hero-field="eyebrow"]' },
  { key: "headlineLine1", selector: '[data-hero-field="headlineLine1"]:not(h1)' },
  { key: "headlineLine2", selector: '[data-hero-field="headlineLine2"]' },
  { key: "subheadline", selector: '[data-hero-field="subheadline"]' },
  { key: "microcopy", selector: '[data-hero-field="microcopy"]' },
] as const;

type Metric = {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacingEm: number;
  /** Block top relative to the hero <section>. */
  topPx: number;
  /** Block bottom relative to the hero <section>. */
  bottomPx: number;
  /** First-line text baseline (top + ascent), relative to hero <section>. */
  baselinePx: number;
  /** Block height. */
  heightPx: number;
};

type Snapshot = {
  viewport: { width: number; height: number };
  hero: { widthPx: number; heightPx: number };
  metrics: Record<string, Metric>;
};

const BASELINE_DIR = path.join(__dirname, "__baselines__");

function baselinePath(project: string): string {
  return path.join(BASELINE_DIR, `hero-typography-${project}.json`);
}

/** Tolerances per property. Strings (font-family / weight / style) are
 *  matched exactly. */
const TOL = {
  fontSizePx: 0.75,
  lineHeightPx: 1.0,
  letterSpacingEm: 0.0015,
  positionPx: 2.0, // top / bottom / baseline
  heightPx: 1.5,
} as const;

/** Normalize the font-family stack so OS-specific fallbacks don't trip
 *  the assertion — only the *first* (primary) family must match. */
function primaryFamily(stack: string): string {
  return (stack.split(",")[0] ?? "")
    .replace(/^["']|["']$/g, "")
    .trim()
    .toLowerCase();
}

for (const { key, selector } of TARGETS) {
  void key;
  void selector;
}

test.describe("Hero typography metrics — leading / tracking / baseline regression", () => {
  test("captures and compares against approved baseline", async ({ page }, testInfo) => {
    // ?hero=last freezes every reveal at its final visible state so we
    // measure the locked end position, not a transient mid-animation frame.
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
    await page.locator('[data-hero-field="headlineLine1"]:not(h1)').waitFor({ state: "visible" });

    // Make absolutely sure web fonts have settled — otherwise font-size
    // and line-height can be off by the fallback metric.
    await page.evaluate(async () => {
      type FontFaceSetLike = { ready?: Promise<unknown> };
      const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
      if (fonts?.ready) await fonts.ready;
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    });

    const snapshot = await page.evaluate(
      ({ targets }) => {
        const hero = document.querySelector('[data-hero-cinematic="true"]') as HTMLElement | null;
        if (!hero) throw new Error("hero section not found");
        const heroRect = hero.getBoundingClientRect();
        const out: Record<string, unknown> = {};
        for (const { key, selector } of targets) {
          const el = document.querySelector(selector) as HTMLElement | null;
          if (!el) {
            out[key] = { missing: true };
            continue;
          }
          const cs = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const fontSizePx = parseFloat(cs.fontSize);
          // letterSpacing is in px; normalise to em so a font-size change
          // doesn't masquerade as a tracking change.
          const lsRaw = cs.letterSpacing;
          let letterSpacingEm = 0;
          if (lsRaw && lsRaw !== "normal") {
            const lsPx = parseFloat(lsRaw);
            if (!Number.isNaN(lsPx) && fontSizePx > 0) letterSpacingEm = lsPx / fontSizePx;
          }
          const lineHeightPx =
            cs.lineHeight === "normal" ? fontSizePx * 1.2 : parseFloat(cs.lineHeight);
          // Approximate first-line baseline = top + ascent. We treat
          // ascent as 0.8 × line-height which matches Chrome's metrics
          // for the fonts in this project closely enough for a ±2px
          // regression band.
          const baselinePx = rect.top - heroRect.top + lineHeightPx * 0.8;
          out[key] = {
            fontFamily: cs.fontFamily,
            fontWeight: cs.fontWeight,
            fontStyle: cs.fontStyle,
            fontSizePx,
            lineHeightPx,
            letterSpacingEm,
            topPx: rect.top - heroRect.top,
            bottomPx: rect.bottom - heroRect.top,
            baselinePx,
            heightPx: rect.height,
          };
        }
        return {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          hero: { widthPx: heroRect.width, heightPx: heroRect.height },
          metrics: out,
        };
      },
      { targets: TARGETS as unknown as Array<{ key: string; selector: string }> },
    );

    const project = testInfo.project.name;
    const file = baselinePath(project);

    if (process.env.UPDATE_HERO_TYPO_BASELINE === "1") {
      fs.mkdirSync(BASELINE_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
      testInfo.attach(`hero-typography-${project}.json`, {
        body: JSON.stringify(snapshot, null, 2),
        contentType: "application/json",
      });
      console.log(`[hero-typography] wrote baseline → ${path.relative(process.cwd(), file)}`);
      return;
    }

    expect(
      fs.existsSync(file),
      `Missing baseline: ${path.relative(process.cwd(), file)}.\n` +
        `Run: UPDATE_HERO_TYPO_BASELINE=1 bunx playwright test hero-typography-metrics --project=${project}`,
    ).toBe(true);

    const baseline = JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot;

    // Attach the live snapshot so failed runs surface the full delta in
    // the HTML report.
    await testInfo.attach(`current-${project}.json`, {
      body: JSON.stringify(snapshot, null, 2),
      contentType: "application/json",
    });

    // Viewport / hero size sanity — a different viewport invalidates
    // every position assertion below.
    expect(snapshot.viewport.width, "viewport width drift").toBe(baseline.viewport.width);

    const failures: string[] = [];
    for (const { key } of TARGETS) {
      const cur = snapshot.metrics[key] as Metric | { missing: true };
      const base = baseline.metrics[key] as Metric | { missing: true };
      if ((cur as { missing?: boolean }).missing) {
        failures.push(`[${key}] element no longer rendered`);
        continue;
      }
      if ((base as { missing?: boolean }).missing) {
        failures.push(`[${key}] not in baseline — regenerate baseline`);
        continue;
      }
      const c = cur as Metric;
      const b = base as Metric;

      // Strict string matches — these are declarative and shouldn't drift.
      if (primaryFamily(c.fontFamily) !== primaryFamily(b.fontFamily))
        failures.push(
          `[${key}] font-family: "${primaryFamily(c.fontFamily)}" ≠ baseline "${primaryFamily(b.fontFamily)}"`,
        );
      if (c.fontWeight !== b.fontWeight)
        failures.push(`[${key}] font-weight: ${c.fontWeight} ≠ ${b.fontWeight}`);
      if (c.fontStyle !== b.fontStyle)
        failures.push(`[${key}] font-style: ${c.fontStyle} ≠ ${b.fontStyle}`);

      // Numeric tolerances.
      const within = (delta: number, tol: number) => Math.abs(delta) <= tol;
      const checks: Array<[keyof Metric, number, number]> = [
        ["fontSizePx", c.fontSizePx - b.fontSizePx, TOL.fontSizePx],
        ["lineHeightPx", c.lineHeightPx - b.lineHeightPx, TOL.lineHeightPx],
        ["letterSpacingEm", c.letterSpacingEm - b.letterSpacingEm, TOL.letterSpacingEm],
        ["topPx", c.topPx - b.topPx, TOL.positionPx],
        ["bottomPx", c.bottomPx - b.bottomPx, TOL.positionPx],
        ["baselinePx", c.baselinePx - b.baselinePx, TOL.positionPx],
        ["heightPx", c.heightPx - b.heightPx, TOL.heightPx],
      ];
      for (const [prop, delta, tol] of checks) {
        if (!within(delta, tol)) {
          failures.push(
            `[${key}] ${prop}: ${(c[prop] as number).toFixed(3)} vs baseline ${(b[prop] as number).toFixed(3)} (Δ ${delta.toFixed(3)} > ±${tol})`,
          );
        }
      }
    }

    expect(
      failures,
      failures.length
        ? `Hero typography drifted vs approved baseline (${project}):\n  • ${failures.join("\n  • ")}\n\n` +
            `If this drift is intentional regenerate with:\n  UPDATE_HERO_TYPO_BASELINE=1 bunx playwright test hero-typography-metrics --project=${project}`
        : "ok",
    ).toEqual([]);
  });
});
