import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guardrail: no code outside the approved list may read the legacy
 * `overview` / `highlights` / `included` / `itinerary` fields directly
 * off a signature-tour object. All UI/logic must go through
 * `getTourContent(tourId)` (src/lib/tourContent.ts).
 *
 * The scan is implemented with Node's filesystem APIs rather than an external
 * command so the contract runs identically in Lovable, GitHub Actions and a
 * clean local checkout.
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

const DIRECT_READ_PATTERN = new RegExp(PATTERN, "i");
const REPOSITORY_ROOT = path.resolve(__dirname, "../..");
const SOURCE_ROOT = path.join(REPOSITORY_ROOT, "src");

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(absolute));
      continue;
    }
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

function directReadHits(): string[] {
  const hits: string[] = [];
  for (const absolute of sourceFiles(SOURCE_ROOT)) {
    const relative = path.relative(REPOSITORY_ROOT, absolute).replace(/\\/g, "/");
    const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (DIRECT_READ_PATTERN.test(line)) hits.push(`${relative}:${index + 1}:${line}`);
    });
  }
  return hits;
}

function isApproved(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  if (APPROVED.has(normalized)) return true;
  return APPROVED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

describe("tour content — no unapproved direct legacy reads", () => {
  it("no file outside the approved list reads tour.overview/highlights/included/itinerary directly", () => {
    const violations = directReadHits().filter((line) => {
      const file = line.split(":")[0];
      if (isApproved(file)) return false;
      const sourceLine = line.split(":").slice(2).join(":");
      return /\b(tour|signature|sot|content|getTourContent)\b/i.test(sourceLine);
    });

    if (violations.length) {
      const message =
        "Direct legacy field reads found outside approved files. " +
        "Use getTourContent(tourId) from @/lib/tourContent instead.\n\n" +
        violations.map((violation) => `  ${violation}`).join("\n");
      throw new Error(message);
    }

    expect(violations).toEqual([]);
  });
});
