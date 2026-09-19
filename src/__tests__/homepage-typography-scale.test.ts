/**
 * Homepage typography scale — shared PDF-canonical hierarchy.
 *
 * Homepage sections now use the shared SectionTitle primitive rather than
 * carrying independent local ramps. This keeps weight, scale and spacing
 * aligned page-to-page while preserving intentional size variants.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexPath = resolve(__dirname, "../routes/index.tsx");
const titlePath = resolve(__dirname, "../components/ui/SectionTitle.tsx");
const src = readFileSync(indexPath, "utf8");
const titleSrc = readFileSync(titlePath, "utf8");

describe("Homepage H2 — shared PDF hierarchy", () => {
  it("uses SectionTitle for the key homepage headings", () => {
    for (const id of ["studio-title", "signatures-title", "final-cta-title"]) {
      expect(src).toMatch(new RegExp(`<SectionTitle[\\s\\S]{0,120}id="${id}"`));
    }
  });

  it("keeps one canonical default ramp and medium editorial weight", () => {
    expect(titleSrc).toContain("text-[clamp(1.875rem,7vw,2.4rem)] md:text-[3.6rem]");
    expect(titleSrc).toContain("font-medium tracking-normal");
  });
});

describe("Homepage eyebrow labels — canonical utility usage", () => {
  it("every major section intro uses .he-eyebrow-bar (via <Eyebrow> primitive or raw class)", () => {
    const requiredEyebrows = ["Experience Studio", "Signature"];
    for (const label of requiredEyebrows) {
      const escaped = label.replace(/&/g, "&amp;");
      // Accept EITHER a raw `.he-eyebrow-bar` wrapper OR the canonical
      // `<Eyebrow …>Label</Eyebrow>` primitive (which compiles down to
      // the same DOM — see src/components/ui/Eyebrow.tsx).
      const rawRe = new RegExp(`he-eyebrow-bar[^"]*"[^>]*>\\s*(?:<[^>]+>\\s*)?${escaped}`);
      const eyebrowRe = new RegExp(`<Eyebrow\\b[^>]*>\\s*${escaped}\\s*</Eyebrow>`);
      expect(
        rawRe.test(src) || eyebrowRe.test(src),
        `missing .he-eyebrow-bar (or <Eyebrow> primitive) wrapper for "${label}"`,
      ).toBe(true);
    }
  });
});
