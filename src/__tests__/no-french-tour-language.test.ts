/**
 * Guard: French must not reappear as a tour-language option.
 *
 * Phase 1 of the bilingual (EN/PT) strategy removed French from every
 * booking / studio / checkout surface. This test scans the runtime source
 * tree for the patterns that would put "fr" back into a user-selectable
 * position and fails if any reappear.
 *
 * Scope:
 * - src/ only (excluding this test itself and historical fixtures).
 * - Detects the specific shapes that made up the FR surface:
 *   • union literals containing "fr" alongside en/pt (`"en" | "pt" | "es" | "fr"`)
 *   • tuple/array literals of language codes containing "fr"
 *     (e.g. `["en", "pt", "es", "fr"]`)
 *   • `knowsLanguage` JSON-LD arrays including "fr"
 *   • segmented option entries like `{ v: "fr", l: "FR" }`
 *
 * We deliberately do NOT flag every occurrence of the two-letter string
 * "fr" — it appears in unrelated contexts (drive-thru, from, etc.).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd());
const SRC = resolve(ROOT, "src");
const SELF = "src/__tests__/no-french-tour-language.test.ts";

const IGNORE_FILES = new Set<string>([SELF]);

const FORBIDDEN_PATTERNS: { name: string; re: RegExp }[] = [
  // Language union types that include "fr" beside en/pt.
  {
    name: "language union type includes 'fr'",
    re: /"(?:en|pt|es|fr)"(?:\s*\|\s*"(?:en|pt|es|fr)")*\s*\|\s*"fr"/,
  },
  // Array literal of language codes containing "fr" (order-independent-ish).
  {
    name: "language tuple/array contains 'fr'",
    re: /\[\s*"(?:en|pt|es)"[^\]]*"fr"\s*(?:,[^\]]*)?\]/,
  },
  // Segmented / options entry that offers "fr".
  {
    name: "segmented option offers { v: 'fr' }",
    re: /\{\s*v\s*:\s*"fr"\s*,\s*l\s*:\s*"FR"\s*\}/,
  },
  // JSON-LD knowsLanguage array with fr.
  {
    name: "knowsLanguage JSON-LD includes 'fr'",
    re: /knowsLanguage\s*:\s*\[[^\]]*"fr"[^\]]*\]/,
  },
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      // Skip generated + snapshot dirs that could produce noise.
      if (entry === "__snapshots__" || entry === "node_modules") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("Phase 1 · French purged from tour-language surfaces", () => {
  it("no forbidden French patterns remain in src/", () => {
    const files = walk(SRC);
    const violations: { file: string; pattern: string; line: number; text: string }[] = [];

    for (const abs of files) {
      const rel = relative(ROOT, abs);
      if (IGNORE_FILES.has(rel)) continue;
      const content = readFileSync(abs, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        for (const { name, re } of FORBIDDEN_PATTERNS) {
          if (re.test(line)) {
            violations.push({ file: rel, pattern: name, line: idx + 1, text: line.trim() });
          }
        }
      });
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `${v.file}:${v.line} · ${v.pattern}\n    → ${v.text}`)
        .join("\n\n");
      throw new Error(
        `Found ${violations.length} forbidden French reference(s) in the tour-language surface:\n\n${msg}\n\n` +
          `Phase 1 of the bilingual strategy removes French from every booking / studio / checkout surface. ` +
          `See .lovable/plan.md.`,
      );
    }

    expect(violations).toEqual([]);
  });
});
