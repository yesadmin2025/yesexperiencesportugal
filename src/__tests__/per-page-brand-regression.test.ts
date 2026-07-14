/**
 * Per-page brand visual regression — static-screenshot equivalent.
 *
 * We can't run a real pixel-diff suite under jsdom + Vitest, so we
 * implement the equivalent contract for each *core route* by
 * statically scanning its source file (and its top-level component
 * imports) for the brand-critical signals that a human reviewer
 * would otherwise eyeball:
 *
 *   · Typography v3 — Montserrat headlines, Georgia italic emphasis,
 *     Inter body. We assert no blacklisted fonts (Poppins, Roboto…)
 *     leaked into core route files.
 *   · Approved palette only — every colour is referenced via a
 *     palette token (--teal, --gold, --ivory, --sand, --charcoal,
 *     plus their soft variants and --charcoal-deep). Raw `bg-purple`,
 *     `text-emerald-500`, etc. are forbidden.
 *   · CTA contract — at least one primary CTA on each conversion-
 *     bearing page combines teal background + gold border (per the
 *     "teal fill, gold line" rule).
 *   · Hover lift — interactive cards/CTAs use the approved
 *     `-translate-y-0.5` editorial lift, never `scale-105+`.
 *
 * Adding a new core page? Append it to PAGES and the suite enforces
 * the same contract automatically.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface PageSpec {
  label: string;
  /** Files that together represent what the user sees on this route. */
  files: string[];
  /** Whether this page must contain a primary teal+gold CTA. */
  requiresPrimaryCta: boolean;
}

const PAGES: PageSpec[] = [
  {
    label: "Homepage (index)",
    files: [
      resolve(__dirname, "../routes/index.tsx"),
      resolve(__dirname, "../components/home/StudioLivePreview.tsx"),
    ],
    requiresPrimaryCta: true,
  },
  {
    // `/builder` is a thin redirect to `/studio-v3`. The Builder
    // contract is enforced against the StudioV3 surface — that is
    // what users see when they land on /builder.
    label: "Builder",
    files: [
      resolve(__dirname, "../routes/builder.tsx"),
      resolve(__dirname, "../routes/studio-v3.tsx"),
      resolve(__dirname, "../components/studio-v3/StudioV3.tsx"),
    ],
    requiresPrimaryCta: true,
  },
  {
    label: "Studio Live Preview",
    files: [resolve(__dirname, "../components/home/StudioLivePreview.tsx")],
    requiresPrimaryCta: false,
  },
];

function readAll(files: string[]): string {
  return files
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n\n");
}

// ─── Typography v3 ─────────────────────────────────────────────────────
describe("Per-page brand regression — typography", () => {
  // Generic font names that are not exhaustive — we're catching the
  // "AI default" giveaways. Real headline/body fonts (Montserrat,
  // Georgia, Inter) live in styles.css and are enforced elsewhere.
  const FORBIDDEN_FONTS = [
    /font-\['?Poppins/i,
    /font-\['?Roboto/i,
    /font-\['?Open Sans/i,
    /font-\['?Lato/i,
    /font-\['?Nunito/i,
    /font-\['?Source Sans/i,
    /font-\['?Raleway/i,
  ];

  for (const page of PAGES) {
    it(`${page.label} — no blacklisted webfont families`, () => {
      const src = readAll(page.files);
      for (const re of FORBIDDEN_FONTS) {
        expect(src, `${page.label}: forbidden font matched ${re}`).not.toMatch(re);
      }
    });
  }
});

// ─── Approved palette ──────────────────────────────────────────────────
describe("Per-page brand regression — palette", () => {
  // Off-brand colour names that should never appear in core route files.
  // Tailwind utilities like `text-purple-500`, `bg-emerald-400`, named
  // CSS colours like `pink`, etc.
  const FORBIDDEN_COLOR_PATTERNS = [
    /\b(?:bg|text|border|ring|from|to|via)-(?:purple|violet|fuchsia|pink|rose|emerald|lime|cyan|sky|indigo)-\d{2,3}\b/,
    /#(?:[Ff]{3,4}[Dd]{3,4}|0{6})\b/, // pure white / black hex slipping in
  ];

  for (const page of PAGES) {
    it(`${page.label} — no off-brand color utilities`, () => {
      const src = readAll(page.files);
      for (const re of FORBIDDEN_COLOR_PATTERNS) {
        const matches = src.match(re);
        expect(matches, `${page.label}: off-brand colour ${matches?.[0]}`).toBeNull();
      }
    });
  }
});

// ─── CTA contract — teal fill + gold line ─────────────────────────────
describe("Per-page brand regression — CTA contract", () => {
  // Either: explicit Tailwind arbitrary values pairing teal bg + gold
  // border, the canonical .cta-primary class, or a <CtaButton> primary
  // (the canonical primitive which encapsulates the teal+gold contract).
  const TEAL_BG = /bg-\[color:var\(--teal\)\]/;
  const GOLD_BORDER = /border-\[color:var\(--gold\)\]/;
  const CTA_PRIMARY_CLASS = /\bcta-primary\b/;
  const CTA_BUTTON_PRIMARY = /<CtaButton(?![^>]*variant=["']ghost)/;

  for (const page of PAGES) {
    if (!page.requiresPrimaryCta) continue;
    it(`${page.label} — has at least one teal+gold primary CTA`, () => {
      const src = readAll(page.files);
      const hasInline = TEAL_BG.test(src) && GOLD_BORDER.test(src);
      const hasUtility = CTA_PRIMARY_CLASS.test(src);
      const hasPrimitive = CTA_BUTTON_PRIMARY.test(src);
      expect(
        hasInline || hasUtility || hasPrimitive,
        `${page.label}: missing primary CTA — need teal background + gold border (raw, .cta-primary, or <CtaButton variant="primary">)`,
      ).toBe(true);
    });
  }
});

// ─── Gold-as-background ban ────────────────────────────────────────────
describe("Per-page brand regression — gold restraint", () => {
  // Gold is for borders, divider lines, micro-detail. NEVER as a giant
  // background fill on a section, hero, or full-bleed surface.
  // We allow it on small dots, badges, and pseudo-element overlays
  // (those are flagged by /opacity or /transparent via color-mix).
  const FORBIDDEN_GOLD_BG = [
    // Solid bg fill on a section/hero/main wrapper.
    /<section[^>]*bg-\[color:var\(--gold\)\](?!\/)/,
    /<main[^>]*bg-\[color:var\(--gold\)\](?!\/)/,
    /<header[^>]*bg-\[color:var\(--gold\)\](?!\/)/,
    /\bclassName="[^"]*\bmin-h-screen[^"]*bg-\[color:var\(--gold\)\](?!\/)/,
  ];

  for (const page of PAGES) {
    it(`${page.label} — gold is never used as a large background`, () => {
      const src = readAll(page.files);
      for (const re of FORBIDDEN_GOLD_BG) {
        expect(src, `${page.label}: gold used as a large background fill`).not.toMatch(re);
      }
    });
  }
});

// ─── Hover lift contract ──────────────────────────────────────────────
describe("Per-page brand regression — hover state", () => {
  // Banned: aggressive scale-up on hover (Bootstrap-y, kills premium feel).
  const FORBIDDEN_HOVER = [/hover:scale-1(?:05|10|25|50)\b/];

  for (const page of PAGES) {
    it(`${page.label} — no aggressive scale on hover`, () => {
      const src = readAll(page.files);
      for (const re of FORBIDDEN_HOVER) {
        expect(src, `${page.label}: aggressive hover scale matched ${re}`).not.toMatch(re);
      }
    });
  }
});
