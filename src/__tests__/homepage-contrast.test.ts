/**
 * Contrast regression — locks WCAG AA contrast for every brand
 * text/surface pairing actually used on the homepage.
 *
 * Approach: hard-code the canonical 8-token palette (verified to match
 * styles.css elsewhere in the suite) and assert every USED pairing
 * meets the threshold appropriate for its role.
 *
 *   · Body / small text on light surfaces  → AA normal (≥4.5:1).
 *   · Headings ≥18px or ≥14px bold        → AA large (≥3.0:1).
 *   · Gold borders (non-text, decorative)  → AA large (≥3.0:1) — gold
 *     is never used as text on ivory/sand.
 *
 * If a future change repoints --charcoal-soft, dims --teal, or tries
 * to use --gold as body text, this suite fails before it ships.
 */
import { describe, it, expect } from "vitest";

// Locked palette (mirrors styles.css; brand-visual-regression.test.ts
// guards the styles.css declarations themselves).
const TOKENS = {
  teal: "#295B61",
  gold: "#C9A96A",
  goldSoft: "#E1CFA6",
  ivory: "#FAF8F3",
  sand: "#F4EFE7",
  charcoal: "#2E2E2E",
  charcoalSoft: "#555555",
  charcoalDeep: "#1F1F1F",
} as const;

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function relLum([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(a: string, b: string): number {
  const la = relLum(hexToRgb(a));
  const lb = relLum(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

interface Pair {
  fg: keyof typeof TOKENS;
  bg: keyof typeof TOKENS;
  /** "normal" = ≥4.5:1, "large" = ≥3.0:1 (≥18px or ≥14px bold). */
  level: "normal" | "large";
  context: string;
}

// Every pairing actually used on the homepage / core routes today.
const USED_PAIRS: Pair[] = [
  // Body copy on light surfaces.
  { fg: "charcoal", bg: "ivory", level: "normal", context: "primary body on ivory" },
  { fg: "charcoal", bg: "sand", level: "normal", context: "primary body on sand" },
  { fg: "charcoalSoft", bg: "ivory", level: "normal", context: "secondary body on ivory" },
  { fg: "charcoalSoft", bg: "sand", level: "normal", context: "secondary body on sand" },
  { fg: "charcoalDeep", bg: "ivory", level: "normal", context: "h1/h2 deep on ivory" },
  { fg: "charcoalDeep", bg: "sand", level: "normal", context: "h1/h2 deep on sand" },
  // Brand accents.
  { fg: "teal", bg: "ivory", level: "normal", context: "teal links/accents on ivory" },
  { fg: "teal", bg: "sand", level: "normal", context: "teal links/accents on sand" },
  // CTA inversion (ivory text on teal fill).
  { fg: "ivory", bg: "teal", level: "normal", context: "primary CTA label on teal" },
  // Charcoal-deep on gold-soft (rare badge case): must clear large.
  { fg: "charcoalDeep", bg: "goldSoft", level: "normal", context: "charcoal on gold-soft pill" },
  // Gold border on teal CTA — decorative, large threshold.
  { fg: "gold", bg: "teal", level: "large", context: "gold border on teal CTA" },
  { fg: "goldSoft", bg: "teal", level: "normal", context: "gold-soft accent on teal" },
];

const THRESHOLD = { normal: 4.5, large: 3.0 } as const;

describe("Homepage contrast — WCAG AA", () => {
  for (const p of USED_PAIRS) {
    it(`${p.context} (${p.fg} on ${p.bg}) meets AA ${p.level}`, () => {
      const ratio = contrast(TOKENS[p.fg], TOKENS[p.bg]);
      expect(
        ratio,
        `${p.context}: ${ratio.toFixed(2)}:1 (need ≥${THRESHOLD[p.level]}:1)`,
      ).toBeGreaterThanOrEqual(THRESHOLD[p.level]);
    });
  }
});

describe("Homepage contrast — banned pairings", () => {
  // Gold (#C9A96A) must NEVER be used as text on ivory/sand: it's
  // ~2:1, well below AA-large. The brand guardrails enforce gold as
  // micro-detail only; this test guarantees the math agrees.
  it("gold on ivory/sand fails AA — must not be used as text", () => {
    const onIvory = contrast(TOKENS.gold, TOKENS.ivory);
    const onSand = contrast(TOKENS.gold, TOKENS.sand);
    // We assert the failure (so the rule is documented), and rely on
    // the per-page brand regression to ensure no `text-[--gold]` slips
    // onto an ivory/sand surface in source.
    expect(onIvory).toBeLessThan(3);
    expect(onSand).toBeLessThan(3);
  });
});
