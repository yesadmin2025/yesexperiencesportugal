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

  it("uses the approved historical display and editorial treatment", () => {
    expect(fiveWays).toContain("home-quick-trust");
    expect(fiveWays).toContain("SITE_RATING_LABEL");
    expect(styles).toContain('--font-display: "Fraunces", serif');
    expect(styles).toContain('--font-serif: "Fraunces", serif');
    // The short service descriptor must be visibly present, not only in data.
    expect(hero).toContain('data-hero-field="subheadline"');
    expect(hero).toContain("{HERO_COPY.subheadline}");
    // Visual hierarchy lock (21 Sep): Hero keeps two CTAs only, no third Travel Designer link.
    expect(hero).not.toContain('to="/portugal-travel-designer"');
    expect(hero).toContain("data-hero-subheadline={HERO_COPY.subheadline}");
  });

  it("preserves draft recovery without duplicating the service cards", () => {
    expect(fiveWays).not.toContain("data-home-primary-path");
    expect(fiveWays).toContain('data-testid="home-smart-start-resume"');
    expect(fiveWays).toContain("<CtaMotionArrow />");
    expect(fiveWays).toContain('href="#reviews"');
  });

  it("keeps the restored section within the YES surfaces", () => {
    expect(fiveWays).toContain("bg-[color:var(--sand)]");
    expect(fiveWays).toContain("py-3 md:py-4");
    expect(styles).not.toMatch(/\.five-ways-card[^}]*animation:[^}]*(bounce|pulse)/i);
  });
});