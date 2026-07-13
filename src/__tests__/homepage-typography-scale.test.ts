/**
 * Homepage typography scale — unified H2 ramp (v4).
 *
 * Refinement Jul 2026: the previously-tiered ramp (conversion vs editorial)
 * has been unified. All four homepage H2s (Studio, Signatures, Groups,
 * Final CTA) now share a single calm ramp so the scroll cadence stays
 * even. Weight stays at font-medium per the homepage H2 exception memory.
 *
 * Ramp: text-[2rem] sm:text-[2.4rem] md:text-[3.4rem]
 * Eyebrows: canonical <Eyebrow> primitive (mem://design/canonical-primitives)
 * — the retired `.he-eyebrow-bar` utility is no longer required.
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

describe("Homepage H2 — unified ramp (Studio, Signatures, Groups, Final CTA)", () => {
  const H2_IDS = ["studio-title", "signatures-title", "groups-title", "final-cta-title"];

  for (const id of H2_IDS) {
    it(`#${id} uses 2rem → 2.4rem → 3.4rem ramp with font-medium`, () => {
      const cls = findH2Block(id);
      expect(extractRem(cls, null), `#${id}: mobile size`).toBe(2);
      expect(extractRem(cls, "sm"), `#${id}: sm size`).toBe(2.4);
      expect(extractRem(cls, "md"), `#${id}: md size`).toBe(3.4);
      // Homepage H2 exception (mem://design/homepage-h2-weight): stays at 500.
      expect(cls, `#${id}: weight`).toContain("font-medium");
    });
  }
});

describe("Homepage eyebrow labels — canonical <Eyebrow> primitive", () => {
  it("major sections use the <Eyebrow> primitive (or the retired .he-eyebrow-bar utility)", () => {
    const requiredEyebrows = ["Experience Studio", "Signature"];
    for (const label of requiredEyebrows) {
      const eyebrowPrimitive = new RegExp(
        `<Eyebrow[^>]*>\\s*${label.replace(/&/g, "&amp;")}`,
      );
      const legacyUtility = new RegExp(
        `he-eyebrow-bar[^"]*"[^>]*>\\s*(?:<[^>]+>\\s*)?${label.replace(/&/g, "&amp;")}`,
      );
      expect(
        eyebrowPrimitive.test(src) || legacyUtility.test(src),
        `missing eyebrow for "${label}" (neither <Eyebrow> nor .he-eyebrow-bar found)`,
      ).toBe(true);
    }
  });
});
