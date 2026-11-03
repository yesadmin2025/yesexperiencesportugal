import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

// Content audits read route source, so each public page writes its single
// main heading as a literal <h1> rather than hiding it behind a prop.
describe("public pages declare one visible main heading", () => {
  for (const route of ["about", "day-tours", "corporate", "faq", "portugal-tours"]) {
    it(`/${route} has exactly one literal <h1>`, () => {
      const src = read(`src/routes/${route}.tsx`);
      expect(src.match(/<h1[\s>]/g)?.length).toBe(1);
      expect(src).not.toContain('as="h1"');
    });
  }

  it("homepage H1 is the visible Hero statement, not a hidden duplicate", () => {
    const hero = read("src/components/home/CinematicHero.tsx");
    expect(hero.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(hero).not.toContain('<h1 className="sr-only"');
    expect(hero).toMatch(/<h1\s+data-hero-stanza="true"/);
  });
});
