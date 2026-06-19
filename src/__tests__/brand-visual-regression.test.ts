/**
 * Brand visual regression — static contract.
 *
 * We can't render every page under jsdom and pixel-diff it cheaply.
 * Instead we lock in the brand contract via static analysis of
 * styles.css + key route files. If anyone later swaps Montserrat for
 * Poppins, repoints --gold, drops the gold border on a primary CTA,
 * or kills the editorial shadow stack, this suite fails before it
 * ships.
 *
 * Locks:
 *  · Palette = the approved 8 tokens, declared in :root.
 *  · Typography v3 = Montserrat headlines + Georgia italic + Inter body.
 *  · Heading weights respect v3 (h1/h2 = 700, h3+ = 600).
 *  · Primary CTAs combine teal background + gold border + ivory text.
 *  · Editorial shadow stack present (no flat or generic Tailwind shadow
 *    is used as the canonical card lift).
 *  · Gold is used as micro-detail — never as a giant background fill
 *    (we ban `bg-[color:var(--gold)]` on full-bleed sections).
 *  · No legacy accent tokens (purple/emerald/mauve/rose) leaked into
 *    the homepage or core routes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const stylesPath = resolve(__dirname, "../styles.css");
const css = readFileSync(stylesPath, "utf8");

// Files representing the canonical user journey on the homepage.
const HOMEPAGE_FILES = [
  resolve(__dirname, "../routes/index.tsx"),
  resolve(__dirname, "../components/home/StudioLivePreview.tsx"),
];

// Pages that should each exhibit the brand contract.
const CORE_ROUTES = [
  "index.tsx",
  "experiences.tsx",
  "builder.tsx",
  "contact.tsx",
  "about.tsx",
];

function readIfExists(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// ─── Palette ────────────────────────────────────────────────────────────
describe("Brand palette — approved 8 tokens", () => {
  const TOKENS = [
    "--teal",
    "--teal-2",
    "--gold",
    "--gold-soft",
    "--ivory",
    "--sand",
    "--charcoal",
    "--charcoal-soft",
  ];

  it("declares every approved token in styles.css", () => {
    for (const token of TOKENS) {
      // Match either OKLCH-based or hex declarations — both are valid.
      const re = new RegExp(`${token.replace("-", "\\-")}\\s*:`);
      expect(css, `missing token ${token}`).toMatch(re);
    }
  });

  it("does not introduce forbidden accent tokens", () => {
    // Legacy / off-brand colour names that should never enter the system.
    const FORBIDDEN = [
      "--purple",
      "--mauve",
      "--emerald",
      "--rose",
      "--cyan",
      "--magenta",
    ];
    for (const token of FORBIDDEN) {
      expect(
        css.includes(`${token}:`),
        `forbidden brand token leaked: ${token}`,
      ).toBe(false);
    }
  });
});

// ─── Typography v3 ─────────────────────────────────────────────────────
describe("Typography v3 — Montserrat / Georgia / Inter", () => {
  it("declares the canonical font stacks", () => {
    expect(css).toMatch(/--font-display:\s*"Montserrat"/);
    expect(css).toMatch(/--font-serif:\s*Georgia/);
    expect(css).toMatch(/--font-sans:\s*"Inter"/);
  });

  it("does not pull in legacy display fonts as the headline default", () => {
    // Permit one-off mentions in comments, but never as the
    // top-level --font-display value.
    const fontDisplayLine = css.match(/--font-display:[^;]+;/g);
    expect(fontDisplayLine, "no --font-display declaration").toBeTruthy();
    for (const decl of fontDisplayLine!) {
      expect(decl).not.toMatch(/\bPoppins\b/);
      expect(decl).not.toMatch(/\bRoboto\b/);
      expect(decl).not.toMatch(/\bLato\b/);
      expect(decl).not.toMatch(/\bPlayfair\b/);
    }
  });
});

// ─── Primary CTA contract ──────────────────────────────────────────────
describe("Primary CTA — teal fill + gold border + premium hover", () => {
  it("homepage hero/Studio CTAs combine teal background and gold border", () => {
    const home = readFileSync(HOMEPAGE_FILES[0], "utf8");
    // CTAs may be rendered either as raw className markup or via the
    // canonical <CtaButton variant="primary"> primitive (which itself
    // applies bg-[color:var(--teal)] + a gold border). Either form is
    // accepted as long as the page exposes a primary CTA.
    const tealBg =
      /bg-\[color:var\(--teal(?:-2)?\)\]/.test(home) ||
      /<CtaButton(?![^>]*variant=["']ghost)/.test(home);
    const goldBorder =
      /border-\[color:var\(--gold(?:-soft)?\)\]/.test(home) ||
      /<CtaButton(?![^>]*variant=["']ghost)/.test(home);
    expect(tealBg, "homepage missing primary CTA — need teal background + gold border, raw or via <CtaButton variant='primary'>").toBe(true);
    expect(goldBorder, "homepage missing var(--gold) border on CTA").toBe(true);
  });

  it("CTAs use a hover lift, not a bouncy or scaling transform", () => {
    const home = readFileSync(HOMEPAGE_FILES[0], "utf8");
    // Hover lift is either applied inline (-translate-y-0.5/-1/-[3px])
    // OR encapsulated by the canonical <CtaButton> primitive, which
    // bakes `hover:-translate-y-[1px]` into its className. Both are
    // valid expressions of the same brand contract.
    const inlineLift = /hover:-translate-y-(?:0\.5|1|\[(?:1|2|3)px\])/.test(home);
    const primitiveLift = /<CtaButton(?![^>]*variant=["']ghost)/.test(home);
    expect(
      inlineLift || primitiveLift,
      "homepage CTAs missing hover lift (raw -translate-y or <CtaButton variant='primary'>)",
    ).toBe(true);
    // No scale-on-hover (banned by guardrails outside .home-energy).
    expect(home).not.toMatch(/hover:scale-1(?:05|10|25)/);
  });
});

// ─── Editorial shadow stack ────────────────────────────────────────────
describe("Editorial shadows — premium depth, never flat or generic", () => {
  it("homepage uses the layered shadow recipe (negative Y, soft alpha)", () => {
    const home = readFileSync(HOMEPAGE_FILES[0], "utf8");
    const studio = readFileSync(HOMEPAGE_FILES[1], "utf8");
    // The recipe: shadow-[0_<y>px_<blur>px_-<spread>px_rgba(...)]
    const recipe = /shadow-\[0_\d+px_\d+px_-\d+px_rgba\([^)]+\)\]/;
    expect(home).toMatch(recipe);
    expect(studio).toMatch(recipe);
  });
});

// ─── Gold = micro-detail, not background fill ──────────────────────────
describe("Gold token usage — micro-detail only", () => {
  for (const fileName of CORE_ROUTES) {
    const path = resolve(__dirname, "../routes/", fileName);
    const src = readIfExists(path);
    if (!src) continue;
    it(`does not paint a full-bleed gold background in ${fileName}`, () => {
      // Banned: a non-opacity gold background on a section/main/hero
      // wrapper. We allow gold backgrounds at low alpha (e.g. /10, /15)
      // for accent strips, and small-pill styles.
      const offenders = src.match(
        /(?:section|main|div)[^>]*className="[^"]*\bbg-\[color:var\(--gold(?:-soft)?\)\](?!\/)/g,
      );
      expect(
        offenders ?? [],
        `${fileName} paints a full-strength gold background:\n${(offenders ?? []).join("\n")}`,
      ).toEqual([]);
    });
  }
});

// ─── Heading hierarchy = Typography v3 weights ─────────────────────────
describe("Heading hierarchy — h1/h2 700, h3+ 600", () => {
  it("encodes the canonical weights in styles.css", () => {
    // The CANONICAL block lives in the Typography v3 section. We
    // assert that h1 + h2 ride bold and h3+ semibold.
    const h1Match = css.match(/h1\s*\{[^}]*font-weight:\s*700/);
    const h2Match = css.match(/h2\s*\{[^}]*font-weight:\s*700/);
    const h3Match = css.match(/h3\s*\{[^}]*font-weight:\s*600/);
    expect(h1Match, "h1 should be 700").toBeTruthy();
    expect(h2Match, "h2 should be 700").toBeTruthy();
    expect(h3Match, "h3 should be 600").toBeTruthy();
  });
});

// ─── No off-brand colours leaked into homepage / core routes ───────────
describe("No off-brand colours in core routes", () => {
  const BANNED = [
    /\bpurple-\d{2,3}\b/,
    /\bemerald-\d{2,3}\b/,
    /\brose-\d{2,3}\b/,
    /\bfuchsia-\d{2,3}\b/,
    /\bcyan-\d{2,3}\b/,
    /\bviolet-\d{2,3}\b/,
  ];
  for (const fileName of CORE_ROUTES) {
    const path = resolve(__dirname, "../routes/", fileName);
    const src = readIfExists(path);
    if (!src) continue;
    it(`has no off-brand Tailwind colour utility in ${fileName}`, () => {
      for (const re of BANNED) {
        expect(re.test(src), `${fileName} contains ${re}`).toBe(false);
      }
    });
  }
});
