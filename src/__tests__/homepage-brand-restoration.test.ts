import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("homepage approved brand restoration", () => {
  const hero = read("src/components/home/CinematicHero.tsx");
  const fiveWays = read("src/components/home/FiveWaysIn.tsx");
  const styles = read("src/styles.css");

  it("keeps the hero headline free from glyph-clipping masks", () => {
    expect(hero).not.toMatch(/hero-title-mask[^\n]*overflow-(?:hidden|clip)/);
    const storyLine = hero.match(/function storyLineStyle[\s\S]*?\n\}/)?.[0] ?? "";
    expect(storyLine).not.toContain("clipPath:");
    expect(hero).toContain('className="hero-h1 m-0 text-center font-serif"');
    expect(styles).toMatch(/\.hero-cinematic \.hero-h1\s*\{[\s\S]*?color:\s*var\(--gold-soft\)/);
  });

  it("uses the approved historical display and editorial treatment in Five Ways", () => {
    expect(fiveWays).toContain("five-ways-title editorial-title-safe");
    expect(styles).toContain(".five-ways-title");
    expect(fiveWays).toContain("font-normal text-[color:var(--teal)]");
    expect(styles).toContain('--font-display: "Fraunces", serif');
    expect(styles).toContain('--font-serif: "Fraunces", serif');
    // The descriptive service line is part of the <h1> so the main heading
    // states the service, not only the brand statement.
    expect(hero).toMatch(/<h1[\s\S]*?\{HERO_COPY\.subheadline\}[\s\S]*?<\/h1>/);
  });

  it("keeps all five paths, visible actions and the canonical arrow", () => {
    for (const id of ["studio", "signature", "designer", "proposals", "corporate"]) {
      expect(fiveWays).toContain(`id: "${id}"`);
    }
    expect(fiveWays).toContain("{path.cta}");
    expect(fiveWays).toContain("<CtaMotionArrow />");
    expect(fiveWays).not.toContain("ResponsiveEditorialImage");
    expect(fiveWays).not.toContain("useHomePaths");
  });

  it("keeps the restored section within the YES surfaces", () => {
    expect(fiveWays).toContain("bg-[color:var(--sand)]");
    expect(styles).toMatch(/\.five-ways-card\s*\{[\s\S]*?background:\s*var\(--ivory\)/);
    expect(styles).not.toMatch(/\.five-ways-card[^}]*animation:[^}]*(bounce|pulse)/i);
  });
});