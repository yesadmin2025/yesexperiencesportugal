/**
 * Mixed roman + italic heading lock
 * ─────────────────────────────────────────────────────────────────
 * Headlines on public marketing pages must use the canonical
 * mixed roman + Georgia-italic-teal emphasis treatment so the brand
 * voice stays consistent. The single source of truth is the
 * `<SectionTitle>` + `<SectionTitle.Em>` primitive in
 * `src/components/ui/SectionTitle.tsx`, which emits
 * `italic font-normal text-[color:var(--teal)]` on the emphasised span.
 *
 * This test scans every public marketing route file and every
 * homepage component for raw `<h1>` / `<h2>` elements whose className
 * contains `serif` (the canonical headline ramp) and asserts that the
 * heading either:
 *
 *   • is rendered through `<SectionTitle>` (preferred), OR
 *   • contains the canonical italic emphasis token
 *     (`italic font-normal text-[color:var(--teal)]` or the
 *     `text-[color:var(--ivory)]` variant for headings on dark
 *     surfaces), OR
 *   • has a `data-mixed-emphasis="exempt"` opt-out attribute, OR
 *   • is purely dynamic (its only content is a `{expression}`
 *     such as a Viator tour title or CMS-driven story slug).
 *
 * If this test fails, do NOT silence it with the opt-out unless
 * the heading is genuinely a one-word title (e.g. "Tours.") with
 * no second phrase that could carry the italic emphasis.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { glob } from "glob";

const ROOT = path.resolve(__dirname, "../..");

// Files to scan: public marketing surfaces only.
const TARGET_GLOBS = [
  "src/routes/index.tsx",
  "src/routes/about.tsx",
  "src/routes/contact.tsx",
  "src/routes/experiences.tsx",
  "src/routes/day-tours.tsx",
  "src/routes/multi-day.tsx",
  "src/routes/corporate.tsx",
  "src/routes/proposals.tsx",
  "src/routes/day-trips-from-lisbon.tsx",
  "src/routes/local-stories.tsx",
  "src/routes/local-stories.$slug.tsx",
  "src/routes/tours.$tourId.tsx",
  "src/routes/tours.$tourId.tailor.tsx",
  "src/components/home/**/*.tsx",
];

// Headings that legitimately do NOT need mixed emphasis:
//   - dynamic Viator/CMS titles (whole content is `{expr}`)
//   - sr-only labels
//   - opt-out via data-mixed-emphasis="exempt"
const EMPHASIS_TOKENS = [
  "italic font-normal text-[color:var(--teal)]",
  "italic font-normal text-[color:var(--ivory)]",
  "SectionTitle.Em",
];

const HEADING_RE = /<(h[12])\b([^>]*)>([\s\S]*?)<\/\1>/g;

function isExempt(openTag: string, inner: string): boolean {
  if (/data-mixed-emphasis=["']exempt["']/.test(openTag)) return true;
  if (/className=["'][^"']*\bsr-only\b/.test(openTag)) return true;
  // Purely dynamic content: only whitespace + a single {expression}
  const stripped = inner.trim();
  if (/^\{[^{}]*(\{[^{}]*\}[^{}]*)*\}$/.test(stripped)) return true;
  return false;
}

function hasSerif(openTag: string): boolean {
  const m = openTag.match(/className=["']([^"']+)["']/);
  if (!m) return false;
  return /\bserif\b/.test(m[1]);
}

function hasEmphasis(inner: string, fileSource: string): boolean {
  if (EMPHASIS_TOKENS.some((t) => inner.includes(t))) return true;
  // Indirect: heading body just renders a child component whose source
  // we control. Conservative — require explicit token presence.
  return false;
}

describe("Mixed roman + italic heading lock", () => {
  const files = TARGET_GLOBS.flatMap((pattern) =>
    glob.sync(pattern, { cwd: ROOT, absolute: true }),
  );

  it("scans at least the expected public marketing surfaces", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  const violations: string[] = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, "utf8");

    // Skip files that render headings only through <SectionTitle> —
    // those are already canonical. We still scan them in case raw
    // <h1>/<h2> sneaks in alongside.
    let match: RegExpExecArray | null;
    HEADING_RE.lastIndex = 0;
    while ((match = HEADING_RE.exec(src)) !== null) {
      const [, , attrs, inner] = match;
      const openTag = `<${match[1]}${attrs}>`;
      if (!hasSerif(openTag)) continue;
      if (isExempt(openTag, inner)) continue;
      if (hasEmphasis(inner, src)) continue;

      const lineNumber = src.slice(0, match.index).split("\n").length;
      violations.push(
        `${rel}:${lineNumber} — <${match[1]} class="serif …"> is missing the canonical ` +
          `italic emphasis span. Use <SectionTitle>/<SectionTitle.Em> or wrap the emphasised ` +
          `phrase in <span className="italic font-normal text-[color:var(--teal)]">…</span>.`,
      );
    }
  }

  it("every serif <h1>/<h2> uses SectionTitle.Em or the canonical italic-teal span", () => {
    expect(violations, violations.join("\n\n")).toEqual([]);
  });
});
