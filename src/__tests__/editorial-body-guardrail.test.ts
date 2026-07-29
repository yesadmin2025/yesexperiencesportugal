/**
 * Editorial-body guardrail.
 *
 * Prose paragraphs on tour, regional, and landing routes must use the
 * `.editorial-body` utility for consistent mobile readability instead
 * of the legacy hand-rolled pattern
 *
 *   text-[16px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.85]
 *
 * (in either token order) — plus close variants of the same intent
 * (leading-[1.8], leading-[1.9], text-[15px]…text-[18px] on charcoal
 * body copy with any leading-[1.7]+).
 *
 * The check is static (no render): a targeted regex sweep over the
 * routes folder. Dark-surface prose (`text-[color:var(--ivory)]`) is
 * out of scope — `.editorial-body` hard-codes charcoal.
 *
 * If this test fails, swap the offending className to `editorial-body`.
 * If the paragraph genuinely needs custom styling (rare — usually a
 * hero italic pull-quote), add its path + line to `EXEMPTIONS` below
 * with a short reason.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROUTES_DIR = resolve(__dirname, "../routes");

/** Route file globs to scan — tour, regional, and landing surfaces. */
const SCAN_PATTERNS: RegExp[] = [
  /^tours\./,
  /^alentejo/,
  /^arrabida/,
  /^evora/,
  /^sintra/,
  /^private-wine-tour-lisbon/,
  /^portugal-tours/,
  /^portugal-wine-tours/,
  /^portugal-travel-designer/,
  /^luxury-tours-portugal/,
  /^private-tours-portugal/,
  /^wine-tours-lisbon/,
  /^day-tours/,
  /^corporate/,
];

/** Files skipped even if they match a scan pattern above. */
const IGNORED_FILES = new Set<string>(["tours.$tourId.tailor.tsx"]);

/** Whitelist for intentional non-editorial-body prose. Each entry MUST
 *  document why the exemption exists. Aim to keep this empty. */
const EXEMPTIONS: Array<{ file: string; line: number; reason: string }> = [];

function listRoutes(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith(".tsx"))
    .filter((f) => !IGNORED_FILES.has(f))
    .filter((f) => SCAN_PATTERNS.some((rx) => rx.test(f)));
}

/** Regexes for the legacy pattern in both token orders + close variants. */
const LEGACY_PATTERNS: Array<{ label: string; rx: RegExp }> = [
  {
    label: "canonical: text-[16px] md:text-[17px] charcoal leading-[1.85]",
    rx: /text-\[16px\]\s+md:text-\[17px\]\s+text-\[color:var\(--charcoal\)\]\s+leading-\[1\.85\]/,
  },
  {
    label: "canonical (reordered): leading first",
    rx: /text-\[16px\]\s+md:text-\[17px\]\s+leading-\[1\.85\]\s+text-\[color:var\(--charcoal\)\]/,
  },
  {
    label: "close variant: leading-[1.8] on charcoal 15–18px body",
    rx: /text-\[(?:15|16|17|18)px\][^"]*text-\[color:var\(--charcoal\)\][^"]*leading-\[1\.8\d?\]/,
  },
  {
    label: "close variant (reordered): leading first, charcoal after",
    rx: /leading-\[1\.8\d?\][^"]*text-\[(?:15|16|17|18)px\][^"]*text-\[color:var\(--charcoal\)\]/,
  },
];

interface Hit {
  file: string;
  line: number;
  patternLabel: string;
  snippet: string;
}

function scanFile(file: string): Hit[] {
  const src = readFileSync(resolve(ROUTES_DIR, file), "utf8");
  const hits: Hit[] = [];
  src.split("\n").forEach((raw, idx) => {
    // Only <p> classNames — that's where prose lives; skip labels,
    // buttons, spans that legitimately share sizing tokens.
    if (!/<p\s[^>]*className=/.test(raw)) return;
    // Skip lines already on the utility.
    if (/\beditorial-body\b/.test(raw)) return;
    // Skip italic / serif pull-quotes — different typographic intent.
    if (/\b(italic|serif)\b/.test(raw)) return;
    // Skip dark-surface prose (ivory/gold on charcoal band).
    if (/text-\[color:var\(--ivory\)\]/.test(raw)) return;
    for (const { label, rx } of LEGACY_PATTERNS) {
      if (rx.test(raw)) {
        hits.push({
          file,
          line: idx + 1,
          patternLabel: label,
          snippet: raw.trim().slice(0, 180),
        });
        break;
      }
    }
  });
  return hits;
}

describe("editorial-body guardrail", () => {
  it("no tour/regional/landing prose paragraph uses the legacy text styling", () => {
    const files = listRoutes();
    expect(files.length).toBeGreaterThan(0);

    const rawHits: Hit[] = files.flatMap(scanFile);
    const hits = rawHits.filter(
      (h) => !EXEMPTIONS.some((e) => e.file === h.file && e.line === h.line),
    );

    if (hits.length > 0) {
      const report = hits
        .map((h) => `  ${h.file}:${h.line}  [${h.patternLabel}]\n    ${h.snippet}`)
        .join("\n");
      throw new Error(
        `Found ${hits.length} prose paragraph(s) still on the legacy text styling ` +
          `instead of \`.editorial-body\`:\n\n${report}\n\n` +
          `Fix: swap the className to \`editorial-body\`. ` +
          `If the paragraph genuinely needs custom styling, add its path + line ` +
          `to EXEMPTIONS in this test with a documented reason.`,
      );
    }

    expect(hits).toEqual([]);
  });
});
