/**
 * Hero typography colors — brand-token regression.
 *
 * Validates that the *computed* foreground colors, opacity, shadow and
 * reveal cadence of the hero eyebrow/headline resolve to the approved
 * YES brand contract:
 *
 *   • Teal      #295B61   (--teal)
 *   • Gold      #C9A96A   (--gold)        ← contained accent
 *   • Gold-soft #E1CFA6   (--gold-soft)   ← gold on dark surfaces
 *   • Ivory     #FAF8F3   (--ivory)       ← headline on dark video
 *   • Charcoal  #2E2E2E   (--charcoal)    ← headline on light surfaces
 *
 * Per-element contract (locked to brand guardrails):
 *   eyebrow        → gold #C9A96A, no shadow, fully opaque
 *   headlineLine1  → ivory #FAF8F3, no shadow, fully opaque
 *   headlineLine2  → gold-soft #E1CFA6, Georgia italic, no shadow, fully opaque
 *   reveal cadence → 220ms ease-out, ordered eyebrow → line1 → line2 → final
 *
 * Tolerance: ΔE-ish per-channel ±10/255 to absorb sub-pixel anti-alias
 * and color-mix compositing jitter. Text-shadows are *not* part of the
 * computed `color` property, so they don't affect this check — but the
 * tolerance is generous enough that any future shadow-blending into the
 * fill (e.g. text-fill-color: color-mix(...)) still passes if the base
 * token is correct.
 *
 * Any drift outside the allow-list (e.g. someone re-points the eyebrow
 * to white, or paints the headline in a non-brand grey) FAILS the build.
 */

import { test, expect, type Page } from "@playwright/test";

type RGB = { r: number; g: number; b: number };

function parseColor(input: string): RGB {
  const m = input.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
  if (!m) throw new Error(`Unparseable color: "${input}"`);
  return { r: +m[1], g: +m[2], b: +m[3] };
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const TOKENS = {
  teal: hexToRgb("#295B61"),
  gold: hexToRgb("#C9A96A"),
  goldSoft: hexToRgb("#E1CFA6"),
  goldWarm: hexToRgb("#D8BE82"),
  goldDeep: hexToRgb("#B89452"),
  ivory: hexToRgb("#FAF8F3"),
  charcoal: hexToRgb("#2E2E2E"),
} as const;

/** Per-channel tolerance — covers AA jitter + minor color-mix composition. */
const CHANNEL_TOL = 10;

function within(a: RGB, b: RGB, tol = CHANNEL_TOL): boolean {
  return Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
}

function fmt(c: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `rgb(${c.r},${c.g},${c.b}) / #${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function matchesAny(
  actual: RGB,
  allow: Array<{ name: string; rgb: RGB }>,
): { ok: true; matched: string } | { ok: false; nearest: string; delta: number } {
  let best = { name: allow[0].name, delta: Number.POSITIVE_INFINITY };
  for (const t of allow) {
    if (within(actual, t.rgb)) return { ok: true, matched: t.name };
    const d =
      Math.abs(actual.r - t.rgb.r) + Math.abs(actual.g - t.rgb.g) + Math.abs(actual.b - t.rgb.b);
    if (d < best.delta) best = { name: t.name, delta: d };
  }
  return { ok: false, nearest: best.name, delta: best.delta };
}

async function getColor(page: Page, selector: string): Promise<RGB> {
  const raw = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`not found: ${sel}`);
    return window.getComputedStyle(el).color;
  }, selector);
  return parseColor(raw);
}

type HeroStyleSnapshot = {
  color: RGB;
  opacity: number;
  textShadow: string;
  fontStyle: string;
  fontWeight: string;
  fontFamily: string;
  transitionDurationMs: number;
  transitionTimingFunction: string;
  revealOrder: number | null;
  revealDurationAttr: string | null;
  revealEaseAttr: string | null;
};

async function getHeroStyle(page: Page, selector: string): Promise<HeroStyleSnapshot> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`not found: ${sel}`);
    const cs = window.getComputedStyle(el);
    const durationSeconds =
      cs.transitionDuration
        .split(",")
        .map((v) => v.trim())
        .find(Boolean) ?? "0s";
    const durationMs = durationSeconds.endsWith("ms")
      ? parseFloat(durationSeconds)
      : parseFloat(durationSeconds) * 1000;
    const m = cs.color.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
    if (!m) throw new Error(`Unparseable color: "${cs.color}"`);
    return {
      color: { r: +m[1], g: +m[2], b: +m[3] },
      opacity: parseFloat(cs.opacity),
      textShadow: cs.textShadow,
      fontStyle: cs.fontStyle,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      transitionDurationMs: durationMs,
      transitionTimingFunction: cs.transitionTimingFunction.split(",")[0]?.trim() ?? "",
      revealOrder: el.dataset.heroRevealOrder ? Number(el.dataset.heroRevealOrder) : null,
      revealDurationAttr: el.dataset.heroRevealDurationMs ?? null,
      revealEaseAttr: el.dataset.heroRevealEase ?? null,
    };
  }, selector);
}

test.describe("Hero typography colors — YES brand-token regression", () => {
  test("eyebrow + headline computed colors match canonical tokens", async ({ page }) => {
    await page.goto("/?hero=last&heroColorDebug=1", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
    await page.locator('[data-hero-field="headlineLine1"]:not(h1)').waitFor({ state: "visible" });

    // Wait for fonts so color resolution from CSS variables is stable.
    await page.evaluate(async () => {
      type FF = { ready?: Promise<unknown> };
      const f = (document as unknown as { fonts?: FF }).fonts;
      if (f?.ready) await f.ready;
    });

    await expect(page.locator('[data-hero-color-debug="true"]')).toBeVisible();

    const eyebrowSel = '[data-hero-field="eyebrow"]';
    const line1Sel = '[data-hero-field="headlineLine1"]:not(h1)';
    const line2Sel = '[data-hero-field="headlineLine2"]';

    const eyebrow = await getColor(page, eyebrowSel);
    const line1 = await getColor(page, line1Sel);
    const line2 = await getColor(page, line2Sel);

    // Eyebrow MUST be the approved brand gold, not white/ivory/gold-soft.
    const eyebrowAllow = [{ name: "gold (#C9A96A)", rgb: TOKENS.gold }];
    const eyebrowMatch = matchesAny(eyebrow, eyebrowAllow);
    expect(
      eyebrowMatch.ok,
      eyebrowMatch.ok
        ? "ok"
        : `Hero eyebrow color ${fmt(eyebrow)} is NOT in the gold family. ` +
            `Nearest token: ${eyebrowMatch.nearest} (Δ=${eyebrowMatch.delta}). ` +
            `Allowed: gold #C9A96A only.`,
    ).toBe(true);

    // Headline line 1 stays quiet ivory; line 2 MUST be approved gold-soft.
    const line1Allow = [{ name: "ivory (#FAF8F3)", rgb: TOKENS.ivory }];
    const line2Allow = [{ name: "gold-soft (#E1CFA6)", rgb: TOKENS.goldSoft }];
    for (const [label, c, allow, allowedDesc] of [
      ["headlineLine1", line1, line1Allow, "ivory #FAF8F3 only"],
      ["headlineLine2 (italic)", line2, line2Allow, "gold-soft #E1CFA6 only"],
    ] as const) {
      const m = matchesAny(c, allow);
      expect(
        m.ok,
        m.ok
          ? "ok"
          : `Hero ${label} color ${fmt(c)} is NOT a YES brand token. ` +
              `Nearest: ${m.nearest} (Δ=${m.delta}). ` +
              `Allowed: ${allowedDesc}.`,
      ).toBe(true);
    }

    for (const [label, sel] of [
      ["eyebrow", eyebrowSel],
      ["headlineLine1", line1Sel],
      ["headlineLine2", line2Sel],
    ] as const) {
      const s = await getHeroStyle(page, sel);
      expect(s.opacity, `${label} must be fully opaque at final state`).toBe(1);
      expect(s.textShadow, `${label} must not use residual text-shadow overrides`).toBe("none");
    }

    const line2Style = await getHeroStyle(page, line2Sel);
    expect(line2Style.fontStyle, "headlineLine2 must remain italic").toBe("italic");
    expect(line2Style.fontWeight, "headlineLine2 must stay regular/refined").toBe("400");
    expect(
      line2Style.fontFamily.toLowerCase(),
      "headlineLine2 must use the serif italic token",
    ).toContain("georgia");

    await expect(page.locator('[data-hero-color-debug="true"] li >> text=OFF')).toHaveCount(0);
  });

  test("hero reveal cadence is locked to 220ms ease-out and sequential order", async ({ page }) => {
    await page.goto("/?hero=last&heroColorDebug=1", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });

    const revealSelectors = [
      '[data-hero-reveal="eyebrow"]',
      '[data-hero-reveal="headlineLine1"]',
      '[data-hero-reveal="headlineLine2"]',
      '[data-hero-reveal="finalBlock"]',
    ];

    const snapshots = [];
    for (const sel of revealSelectors) snapshots.push(await getHeroStyle(page, sel));

    expect(snapshots.map((s) => s.revealOrder)).toEqual([1, 2, 3, 4]);
    for (const [index, s] of snapshots.entries()) {
      const label = revealSelectors[index];
      expect(s.revealDurationAttr, `${label} must declare the approved duration`).toBe("220");
      expect(s.revealEaseAttr, `${label} must declare the approved easing`).toBe("ease-out");
      expect(s.transitionDurationMs, `${label} transition duration`).toBeCloseTo(220, 0);
      expect(
        ["ease-out", "cubic-bezier(0, 0, 0.58, 1)"].includes(s.transitionTimingFunction),
        `${label} transition timing must be ease-out, got ${s.transitionTimingFunction}`,
      ).toBe(true);
    }
  });
});
