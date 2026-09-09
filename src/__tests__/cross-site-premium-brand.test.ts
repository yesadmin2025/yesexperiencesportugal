import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("cross-site premium brand contract", () => {
  it("keeps the approved road film as one canonical 27-second asset with mobile-first delivery", () => {
    const manifest = read("src/content/hero-scenes-manifest.ts");
    const hero = read("src/components/home/CinematicHero.tsx");

    expect(manifest).toContain('const FILM_720 = "/video/hero-sunset-road-27s-720.mp4"');
    expect(manifest).toContain('const FILM_1080 = "/video/hero-sunset-road-27s-1080.mp4"');
    expect(manifest).toContain("durationSeconds: 27.133333");
    expect(hero.match(/^\s*<video\b/gm)).toHaveLength(1);
    expect(hero).toContain('preload="metadata"');
    expect(hero).toMatch(/src=\{HERO_FILM\.src720\}[\s\S]*?media="\(max-width: 767px\)"/);
  });

  it("uses the shared title emphasis and real editorial destinations", () => {
    const experiences = read("src/routes/experiences.tsx");
    const designer = read("src/routes/portugal-travel-designer.tsx");
    const multiDay = read("src/routes/multi-day.tsx");
    const ways = read("src/components/home/FourWaysIn.tsx");
    const heroCopy = read("src/content/hero-copy.ts");

    expect(experiences).toContain("Three easy places <SectionTitle.Em>to begin.</SectionTitle.Em>");
    expect(designer).toContain("Portugal, <SectionTitle.Em>shaped around you.</SectionTitle.Em>");
    expect(multiDay).toContain('to="/portugal-travel-designer"');
    expect(heroCopy).toContain('brandLine: "Continue the story across Portugal →"');
    expect(ways).toContain('to="/proposal-in-portugal"');
    expect(ways).toContain('to="/corporate"');
  });
});