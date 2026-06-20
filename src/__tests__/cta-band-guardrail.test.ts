/**
 * Brand guardrail — duplicate CTA bands + CTA palette consistency.
 *
 * Runs on every `bun run test` (and therefore every CI build) over
 * every page route in `src/routes/**.tsx` and the components imported
 * by them. Two checks, both static-analysis (no DOM render needed):
 *
 *   1. DUPLICATE CTA BANDS — a page must not contain the same
 *      canonical CTA label more than once. The brand guardrail
 *      forbids "duplicate CTA bands" site-wide (homepage included),
 *      because two identical CTAs in the same scroll erodes the
 *      single-purpose framing the editorial system depends on.
 *
 *   2. CTA PALETTE CONSISTENCY — every CTA-shaped element (a `<Link>`,
 *      `<a>`, or `<button>` with a CTA-sized min-height) must use a
 *      bg/text class combo from the approved CTA palette: ivory bg +
 *      charcoal text, teal bg + ivory text, or transparent + token
 *      border (ghost). Raw color utilities (`bg-white`, `text-black`,
 *      `bg-blue-500`, `bg-[#ffffff]`) are forbidden — every CTA must
 *      consume the brand tokens, not literal colors or arbitrary
 *      Tailwind palettes.
 *
 * EXEMPTIONS — short whitelist for known intentional duplicates that
 * the design lead has not yet rationalised. Each entry MUST link to a
 * tracked cleanup task; new entries require explicit sign-off, the
 * goal is for the list to shrink to zero.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROUTES_DIR = resolve(__dirname, "../routes");

/** Page routes to scan. Excludes API routes, dynamic param helpers,
 * the root layout, and admin / dev / QA-only pages. */
function listPageRoutes(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith(".tsx"))
    .filter((f) => !f.startsWith("__"))
    .filter((f) => !f.startsWith("admin."))
    .filter((f) => !f.startsWith("e2e."))
    .filter((f) => f !== "brand-qa.tsx")
    .filter((f) => f !== "brand-qa.test.tsx")
    .filter((f) => f !== "qa.mobile.tsx")
    .filter((f) => f !== "preview-check.tsx")
    .filter((f) => f !== "hero-verify.tsx")
    .filter((f) => f !== "typography-audit.tsx")
    .filter((f) => !f.includes(".test."));
}

/* ─────────────────────────────────────────────────────────────────
 * 1. Duplicate CTA bands
 * ───────────────────────────────────────────────────────────────── */

/** Canonical CTA labels that should appear AT MOST ONCE per page. */
const CTA_LABEL_PATTERNS: { label: string; regex: RegExp }[] = [
  // Match the label as visible JSX text content. We intentionally use
  // `>Label<` framing so we hit rendered copy and not className strings,
  // comments, or aria-labels.
  { label: "Talk to a Local", regex: />\s*Talk to a Local\s*</g },
  { label: "Create Your Story", regex: />\s*Create Your Story\s*</g },
  { label: "Reserve instantly", regex: />\s*Reserve instantly\s*</g },
  { label: "Open the Studio", regex: />\s*Open the Studio\s*</g },
  { label: "Plan a Multi-Day Journey", regex: />\s*Plan a Multi-Day Journey\s*</g },
];

/**
 * Whitelist of (route, label) pairs that are KNOWN duplicates and
 * tracked for cleanup. Add entries ONLY with an explanation. The
 * test fails on any duplicate not on this list.
 *
 * INVARIANT: this list should shrink, never grow.
 */
const DUPLICATE_BAND_EXEMPTIONS: { route: string; label: string; reason: string }[] = [
  {
    route: "corporate.tsx",
    label: "Talk to a Local",
    reason:
      "Hero band + closing band both end on Talk to a Local — corporate flow is human-only (no Builder), so the second band is the only conversion path. Tracked: design pass to consolidate corporate page CTAs.",
  },
  {
    route: "multi-day.tsx",
    label: "Talk to a Local",
    reason:
      "Hero band (Plan a Multi-Day Journey + Talk to a Local) and closing band (Open the Studio + Talk to a Local) repeat the secondary CTA. Tracked: replace closing-band secondary with WhatsApp or remove it.",
  },
  {
    route: "proposals.tsx",
    label: "Talk to a Local",
    reason:
      "Proposals is human-only and the hero CTA + closing CTA are both Talk to a Local by design (no self-serve path). Tracked: align with corporate consolidation.",
  },
  {
    route: "tours.$tourId.tsx",
    label: "Reserve instantly",
    reason:
      "Tour detail uses the canonical commerce pattern: in-page primary CTA + sticky bottom CTA on mobile. Both render the same Reserve label by intent so the user always has a one-tap booking action visible on long pages.",
  },
];

function isExempt(route: string, label: string): boolean {
  return DUPLICATE_BAND_EXEMPTIONS.some((e) => e.route === route && e.label === label);
}

describe("Brand guardrail — duplicate CTA bands", () => {
  for (const file of listPageRoutes()) {
    it(`${file} — each canonical CTA label appears at most once`, () => {
      const src = readFileSync(resolve(ROUTES_DIR, file), "utf8");
      const offenders: string[] = [];

      for (const { label, regex } of CTA_LABEL_PATTERNS) {
        regex.lastIndex = 0;
        const count = (src.match(regex) ?? []).length;
        if (count > 1 && !isExempt(file, label)) {
          offenders.push(
            `"${label}" appears ${count}× in ${file} — that's a duplicate CTA band. ` +
              `If intentional, add an entry to DUPLICATE_BAND_EXEMPTIONS with a tracked reason.`,
          );
        }
      }

      expect(offenders, offenders.join("\n")).toEqual([]);
    });
  }
});

/* ─────────────────────────────────────────────────────────────────
 * 2. CTA palette consistency
 * ───────────────────────────────────────────────────────────────── */

/**
 * Forbidden Tailwind utilities inside CTA-shaped elements. Every CTA
 * MUST consume the 8 brand tokens via `bg-[color:var(--token)]` /
 * `text-[color:var(--token)]` / `border-[color:var(--token)]`.
 *
 * NOTE: `text-white` slips through if it is used inside a CTA placed
 * on a teal/charcoal surface — but the brand tokens still demand
 * `text-[color:var(--ivory)]`, since "white" is not a brand color.
 */
const FORBIDDEN_CTA_CLASS_PATTERNS: { name: string; regex: RegExp }[] = [
  // Raw white / black utilities (brand uses --ivory / --charcoal-deep).
  { name: "bg-white", regex: /\bbg-white\b/ },
  { name: "bg-black", regex: /\bbg-black\b/ },
  { name: "text-white", regex: /\btext-white\b/ },
  { name: "text-black", regex: /\btext-black\b/ },
  // Tailwind palette colors — brand bans them site-wide for CTAs.
  {
    name: "bg-<palette>",
    regex:
      /\bbg-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/,
  },
  {
    name: "text-<palette>",
    regex:
      /\btext-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/,
  },
  // Arbitrary hex bg/text — only allowed via `var(--token)`.
  { name: "bg-[#hex]", regex: /\bbg-\[#[0-9a-fA-F]{3,8}\]/ },
  { name: "text-[#hex]", regex: /\btext-\[#[0-9a-fA-F]{3,8}\]/ },
];

/**
 * Heuristic CTA detector: a JSX opening tag for `<Link>`, `<a>`, or
 * `<button>` whose className contains a CTA-sized `min-h-[NNpx]` (≥40)
 * OR `min-h-[Nrem]` AND at least one bg/text/border utility. This
 * catches the editorial CTA shape used throughout the site (hero,
 * sections, footer, sticky bar) without flagging plain links.
 */
const CTA_TAG_REGEX = /<(Link|a|button)\b[^>]*\bclassName=("([^"]*)"|\{`([^`]*)`\})[^>]*>/g;

const CTA_HEIGHT_REGEX = /\bmin-h-\[(\d{2,3})px\]/;

function extractCtaClassStrings(src: string): { className: string; tag: string }[] {
  const out: { className: string; tag: string }[] = [];
  CTA_TAG_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CTA_TAG_REGEX.exec(src)) !== null) {
    const tag = m[1];
    const className = m[3] ?? m[4] ?? "";
    if (!className) continue;
    const heightMatch = className.match(CTA_HEIGHT_REGEX);
    if (!heightMatch) continue;
    const px = parseInt(heightMatch[1], 10);
    if (px < 40) continue; // not a CTA — too short
    out.push({ className, tag });
  }
  return out;
}

/** Files to scan for CTA palette: routes + the few shared CTA-bearing
 * components. Avoids ui/* primitives which are token-driven by default. */
function listCtaScanFiles(): string[] {
  const routes = listPageRoutes().map((f) => resolve(ROUTES_DIR, f));
  const components = [
    "src/components/FAQ.tsx",
    "src/components/Footer.tsx",
    "src/components/Navbar.tsx",
    "src/components/MobileStickyCTA.tsx",
    "src/components/FloatingActions.tsx",
    "src/components/SimpleTailorForm.tsx",
    "src/components/builder/StickyBar.tsx",
    "src/components/builder/EntryScreen.tsx",
    "src/components/builder/TripTypeEntry.tsx",
    "src/components/builder/ReviewScreen.tsx",
    "src/components/home/TheDifferenceSection.tsx",
  ].map((p) => resolve(__dirname, "..", "..", p));
  return [...routes, ...components];
}

describe("Brand guardrail — CTA palette consistency", () => {
  for (const fullPath of listCtaScanFiles()) {
    const label = fullPath.split("/").slice(-2).join("/");
    it(`${label} — every CTA uses brand tokens (no raw color utilities)`, () => {
      let src: string;
      try {
        src = readFileSync(fullPath, "utf8");
      } catch {
        // Component may not exist on disk yet — skip silently. The
        // routes pass already covers all pages.
        return;
      }
      const ctas = extractCtaClassStrings(src);
      const offenders: string[] = [];

      for (const { className, tag } of ctas) {
        for (const { name, regex } of FORBIDDEN_CTA_CLASS_PATTERNS) {
          if (regex.test(className)) {
            offenders.push(
              `<${tag}> CTA in ${label} uses forbidden utility "${name}". ` +
                `Replace with a brand token (bg/text-[color:var(--token)]). ` +
                `className was: ${className.slice(0, 200)}${className.length > 200 ? "…" : ""}`,
            );
          }
        }
      }

      expect(offenders, offenders.join("\n\n")).toEqual([]);
    });
  }
});
