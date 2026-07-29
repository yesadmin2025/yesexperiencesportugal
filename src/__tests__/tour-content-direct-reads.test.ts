import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Guardrail: no code outside the approved list may read the legacy
 * `overview` / `highlights` / `included` / `itinerary` fields directly
 * off a signature-tour object. All UI/logic must go through
 * `getTourContent(tourId)` (src/lib/tourContent.ts).
 *
 * Approved exceptions (files allowed to touch the legacy fields):
 *   - src/lib/tourContent.ts                      — the helper itself
 *   - src/lib/checkout/inclusions.ts              — SoT-first w/ legacy fallback
 *   - src/lib/checkout/__tests__/                 — locked contract tests
 *   - src/lib/viatorValidation.ts                 — diffs legacy vs Viator meta
 *   - src/i18n/tour-i18n.ts                       — merges translation overlays
 *   - src/data/**                                 — source-of-truth data files
 *   - src/routes/admin.*                          — admin/import/validation tools
 *   - src/server/tourImporter.server.ts           — importer
 *   - Files already-swapped that keep inline SoT-empty fallbacks:
 *       src/routes/tours.$tourId.tsx
 *       src/components/SimpleBookingForm.tsx
 *       src/components/studio-v3/FinalRevealStory.tsx
 *       src/components/studio-v3/StudioV3.tsx
 *       src/components/studio-v3/signatureStorySnapshot.ts
 *   - This test file
 */

const APPROVED = new Set<string>([
  "src/lib/tourContent.ts",
  "src/lib/checkout/inclusions.ts",
  "src/lib/viatorValidation.ts",
  "src/i18n/tour-i18n.ts",
  "src/server/tourImporter.server.ts",
  "src/routes/tours.$tourId.tsx",
  "src/components/SimpleBookingForm.tsx",
  "src/components/studio-v3/FinalRevealStory.tsx",
  "src/components/studio-v3/StudioV3.tsx",
  "src/components/studio-v3/signatureStorySnapshot.ts",
  "src/__tests__/tour-content-direct-reads.test.ts",
]);

const APPROVED_PREFIXES = [
  "src/data/",
  "src/routes/admin.",
  "src/lib/checkout/__tests__/",
  "src/lib/__tests__/tourContent",
];

// Match all of:
//   - Dot / optional-chain access:  t.overview, t?.overview
//   - Bracket string access:        t["overview"], t?.["overview"]
//   - Destructuring w/ separators:  { overview, ... }, { overview } = tour, { overview: alias }
//   - Destructuring with default:   { overview = [] }
const FIELDS = "overview|highlights|included|itinerary";
const PATTERN =
  String.raw`(\??\.\s*(` +
  FIELDS +
  String.raw`)\b)` +
  String.raw`|(\??\.\s*\[\s*["'](` +
  FIELDS +
  String.raw`)["']\s*\])` +
  String.raw`|(\[\s*["'](` +
  FIELDS +
  String.raw`)["']\s*\])` +
  String.raw`|(\b(` +
  FIELDS +
  String.raw`)\s*[,}:=])`;

function rg(pattern: string): string[] {
  try {
    const out = execSync(
      `rg -n --no-heading -g 'src/**/*.{ts,tsx}' -e ${JSON.stringify(pattern)}`,
      { cwd: path.resolve(__dirname, "../.."), encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean);
  } catch (e: any) {
    // rg exits 1 when no matches — treat as empty.
    if (e?.status === 1) return [];
    throw e;
  }
}

function isApproved(file: string): boolean {
  const norm = file.replace(/\\/g, "/");
  if (APPROVED.has(norm)) return true;
  return APPROVED_PREFIXES.some((p) => norm.startsWith(p));
}

describe("tour content — no unapproved direct legacy reads", () => {
  it("no file outside the approved list reads tour.overview/highlights/included/itinerary directly", () => {
    const hits = rg(PATTERN);
    const violations = hits.filter((line) => {
      const file = line.split(":")[0];
      if (isApproved(file)) return false;
      // Only flag when the token appears alongside a tour-shaped context
      // (a `tour`, `signature`, `SoT`, `content`, or `getTourContent` reference).
      // Otherwise this pattern is too broad (every `overview` word matches).
      // We narrow using the source line.
      const rest = line.split(":").slice(2).join(":");
      return /\b(tour|signature|sot|content|getTourContent)\b/i.test(rest);
    });
    if (violations.length) {
      const msg =
        "Direct legacy field reads found outside approved files. " +
        "Use getTourContent(tourId) from @/lib/tourContent instead.\n\n" +
        violations.map((v) => "  " + v).join("\n");
      throw new Error(msg);
    }
    expect(violations).toEqual([]);
  });
});
