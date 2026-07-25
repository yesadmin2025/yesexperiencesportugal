import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Positive guardrail (complement to `tour-content-direct-reads.test.ts`).
 *
 * Every UI file that renders tour-shaped body content
 * (overview / highlights / included / itinerary) MUST import
 * `getTourContent` from `@/lib/tourContent` and use it — not read
 * the legacy fields directly off a `signatureTours` entry or a
 * `SignatureTour`-shaped variable.
 *
 * The list below is the curated set of tour-shaped UI consumers.
 * When you add a new component/route that renders any of those
 * four fields, add it here so we lock the contract in CI.
 */

const REQUIRED_CONSUMERS = [
  // Tour detail + booking surfaces
  "src/routes/tours.$tourId.tsx",
  "src/components/SimpleBookingForm.tsx",

  // Studio V3 — final reveal + composer summary
  "src/components/studio-v3/StudioV3.tsx",
  "src/components/studio-v3/FinalRevealStory.tsx",
  "src/components/studio-v3/signatureStorySnapshot.ts",

  // Signature listings (EN + PT) + homepage cards
  "src/routes/experiences.tsx",
  "src/routes/pt.experiences.tsx",
  "src/routes/index.tsx",
];

const IMPORT_RE =
  /import\s+(?:\{[^}]*\bgetTourContent\b[^}]*\}|[^;]*\bgetTourContent\b[^;]*)\s+from\s+["']@\/lib\/tourContent["']/;

const CALL_RE = /\bgetTourContent\s*\(/;

describe("tour content — required getTourContent usage", () => {
  it.each(REQUIRED_CONSUMERS)(
    "%s imports and calls getTourContent from @/lib/tourContent",
    (rel) => {
      const abs = path.resolve(__dirname, "../..", rel);
      const src = readFileSync(abs, "utf8");
      expect(IMPORT_RE.test(src), `${rel}: missing import { getTourContent } from "@/lib/tourContent"`).toBe(true);
      expect(CALL_RE.test(src), `${rel}: imports getTourContent but never calls it`).toBe(true);
    },
  );
});
