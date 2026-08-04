import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * The two reveal-arc headlines are locked product copy. They are asserted on
 * source so a refactor of either component cannot silently reword them.
 */
describe("Studio V3 emotional arc headlines", () => {
  it("opens with `Portugal is waiting…`", () => {
    const src = read("src/components/studio-v3/StudioV3Intro.tsx");
    const headline = src
      .slice(src.indexOf('data-testid="studio-v3-intro-headline"'))
      .slice(0, 1200)
      .replace(/<[^>]*>/g, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\s+/g, " ");
    expect(headline).toContain("Portugal is waiting…");
    expect(src).toContain("A few quiet choices, and Portugal begins to take your shape.");
  });

  it("closes with `Your Portugal is ready.`", () => {
    const src = read("src/components/studio-v3/FinalRevealStory.tsx");
    const headline = src
      .slice(src.indexOf('data-testid="studio-v3-final-reveal-headline"'))
      .slice(0, 1200)
      .replace(/<[^>]*>/g, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\s+/g, " ");
    expect(headline).toContain("Your Portugal is ready.");
    expect(src).toContain("<Eyebrow>Your Signature</Eyebrow>");
    expect(src).toContain("A private day shaped from what matters to you.");
  });
});
