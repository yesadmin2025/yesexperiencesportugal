/**
 * Pass 1B — Tailor conversion surgery.
 *
 * Source-contract regressions for the customer-facing Tailor editor:
 * three groups only (Moments · Rhythm · Enhance), one primary CTA,
 * no operational form clutter, no internal vocabulary, no named
 * winery estates. Pricing math, payload fields and eligibility rules
 * are covered by the pricing suites and must stay untouched here.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/routes/tours_.$tourId.tailor.tsx", "utf8");

describe("Tailor editor information architecture", () => {
  it("presents exactly the three approved groups", () => {
    expect(src).toMatch(/<Group title="Moments">/);
    expect(src).toMatch(/<Group title="Rhythm">/);
    expect(src).toMatch(/<Group title="Enhance">/);
    const groups = [...src.matchAll(/<Group title="([^"]+)"/g)].map((m) => m[1]);
    expect(groups).toEqual(["Moments", "Rhythm", "Enhance"]);
  });

  it("has exactly one primary reserve CTA, labelled 'Reserve this version'", () => {
    expect(src).toContain("Reserve this version");
    expect(src.match(/Reserve this version/g)!.length).toBe(1);
    expect(src).not.toContain("Reserve securely");
    expect(src.match(/data-testid="tailor-reserve-cta"/g)!.length).toBe(1);
  });

  it("uses the canonical total-first price component", () => {
    expect(src).toMatch(/<ChargeSummaryLine className="mt-3" quote=\{versionQuote\} \/>/);
    expect(src).toMatch(/data-testid="tailor-your-version"/);
  });
});

describe("Tailor removes operational clutter from the editor", () => {
  it("collects operational preferences in the shared final-details step", () => {
    expect(src).not.toContain("Accessibility & comfort");
    expect(src).not.toContain("Anything else?");
    expect(src).not.toMatch(/<Group title="Pickup"/);
    expect(src).toContain("<FinalDetailsDialog");
  });

  it("still carries pickup, language, accessibility and notes into the payload", () => {
    for (const field of ["pickup", "language", "accessibility", "notes"]) {
      expect(src).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });
});

describe("Tailor customer copy stays truthful", () => {
  it("drops internal system vocabulary", () => {
    // Comments may describe internals; customer-visible source must not.
    const visible = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .toLowerCase();
    for (const phrase of [
      "confirmation status",
      "manual confirmation",
      "subject to supplier availability",
      "principal stop",
      "the stops stay",
    ]) {
      expect(visible).not.toContain(phrase);
    }
  });


  it("only advertises a −5% delta for genuinely eligible removals", () => {
    expect(src).toMatch(/earnsReduction: principalEligible\.has\(s\.id\)/);
    expect(src).toMatch(/More time elsewhere\s*\{m\.earnsReduction \? " · −5%" : ""\}/);
  });

  it("describes rhythm by consequence, without a price claim", () => {
    expect(src).toContain("Longer stays, fewer transitions.");
    expect(src).toContain("More moments, tighter timing.");
    expect(src).toContain("A natural flow through the day.");
  });
});
