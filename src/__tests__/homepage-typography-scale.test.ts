/**
 * Homepage typography scale — three-voice tiering (v3).
 *
 * Refinement Nov 2026: five H2s previously shared a single ramp
 * (2 / 2.4 / 3.6), so conversion, editorial and informational
 * sections shouted at equal volume. v3 splits them into three
 * voices with clearly distinct rhythm:
 *
 *   · CONVERSION tier — Studio + Final CTA
 *     "Do something now" sections. Largest type, tightest leading,
 *     italic emphasis carries the action.
 *     → text-[2.1rem] sm:text-[2.5rem] md:text-[3.8rem]
 *       leading-[1.05] md:leading-[0.96], tracking-[-0.02em]
 *
 *   · EDITORIAL tier — Signatures + Groups
 *     Discovery / browsing sections. Mid scale, calmer leading.
 *     → text-[1.8rem] sm:text-[2.1rem] md:text-[2.95rem]
 *       leading-[1.12] md:leading-[1.02], tracking-[-0.014em]
 *
 *   · INFORMATIONAL tier — Three ways
 *     Sub-section primer / navigation. Compact.
 *     → text-[1.7rem] sm:text-[1.95rem] md:text-[2.4rem]
 *
 * Eyebrows: .he-eyebrow-bar utility (unchanged).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexPath = resolve(__dirname, "../routes/index.tsx");
const src = readFileSync(indexPath, "utf8");

function findH2Block(id: string): string {
  const re = new RegExp(`id="${id}"[^>]*className="([^"]+)"`);
  const m = src.match(re);
  if (!m) throw new Error(`H2 with id="${id}" not found`);
  return m[1];
}

function extractRem(cls: string, prefix: string | null): number | null {
  const re = prefix
    ? new RegExp(`${prefix}:text-\\[(\\d+(?:\\.\\d+)?)rem\\]`)
    : /(?:^|\s)text-\[(\d+(?:\.\d+)?)rem\]/;
  const m = cls.match(re);
  return m ? parseFloat(m[1]) : null;
}

describe("Homepage H2 — conversion tier (Studio, Final CTA)", () => {
  const CONVERSION_IDS = ["studio-title", "final-cta-title"];

  for (const id of CONVERSION_IDS) {
    it(`#${id} uses 2.1rem → 2.5rem → 3.8rem ramp`, () => {
      const cls = findH2Block(id);
      expect(extractRem(cls, null), `#${id}: mobile size`).toBe(2.1);
      expect(extractRem(cls, "sm"), `#${id}: sm size`).toBe(2.5);
      expect(extractRem(cls, "md"), `#${id}: md size`).toBe(3.8);
    });
  }
});

describe("Homepage H2 — editorial tier (Signatures, Groups)", () => {
  const EDITORIAL_IDS = ["signatures-title", "groups-title"];

  for (const id of EDITORIAL_IDS) {
    it(`#${id} uses 1.8rem → 2.1rem → 2.95rem ramp`, () => {
      const cls = findH2Block(id);
      expect(extractRem(cls, null), `#${id}: mobile size`).toBe(1.8);
      expect(extractRem(cls, "sm"), `#${id}: sm size`).toBe(2.1);
      expect(extractRem(cls, "md"), `#${id}: md size`).toBe(2.95);
    });
  }
});

// Informational tier (three-paths-title) lives in ThreePathsSection.tsx
// — locked in that component's own ramp (1.7 / 1.95 / 2.4) and not
// re-validated here because this suite scans src/routes/index.tsx.


describe("Homepage eyebrow labels — canonical utility usage", () => {
  it("every major section intro uses .he-eyebrow-bar", () => {
    const requiredEyebrows = [
      "Experience Studio",
      "Signature experiences",
    ];
    for (const label of requiredEyebrows) {
      const re = new RegExp(`he-eyebrow-bar[^"]*"[^>]*>\\s*(?:<[^>]+>\\s*)?${label.replace(/&/g, "&amp;")}`);
      expect(re.test(src), `missing .he-eyebrow-bar wrapper for "${label}"`).toBe(true);
    }
  });
});
