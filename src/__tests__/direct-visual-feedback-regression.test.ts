import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getSignatureCardHighlights } from "@/lib/signatureCardHighlights";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("latest direct visual feedback", () => {
  it("selects the requested canonical decision highlights", () => {
    expect(getSignatureCardHighlights("arrabida-wine-allinclusive")).toEqual([
      "Working Azeitão azulejo factory visit",
      "Two selected wineries included, up to four in Tailor",
      "Traditional Azeitão lunch included",
    ]);
    expect(getSignatureCardHighlights("sintra-cascais")).toEqual([
      "One palace plus wine tasting, or two palace tickets",
      "Azenhas do Mar, Cabo da Roca and Cascais",
      "Flexible palace selection with expert guide",
    ]);
    for (const id of ["troia-comporta", "roman-heritage-alentejo", "wild-beaches-picnic"]) {
      expect(getSignatureCardHighlights(id)).toHaveLength(3);
    }
  });

  it("keeps direct human contact prominent in the About close", () => {
    const about = read("src/routes/about.tsx");
    expect(about).toContain("Talk to us directly");
    expect(about).toContain("Talk to a local");
    expect(about).toContain('<CtaButton href={whatsappUrl()}');
    expect(about).toContain('<Link to="/contact"');
    expect(about).toContain('<Link to="/studio"');
  });

  it("uses the requested chapter rhythm and existing Scene sequence", () => {
    const home = read("src/routes/index.tsx");
    const ways = read("src/components/home/FiveWaysIn.tsx");
    const journey = read("src/components/home/RecentJourney.tsx");
    expect(home).toContain("section-enter py-12 md:py-16");
    expect(home).toContain("pt-10 pb-12 md:pt-14 md:pb-16");
    expect(ways).toContain("pt-16 pb-10 md:pt-20 md:pb-14");
    expect(journey).toContain("section-enter py-12 md:py-16");
    expect(home).toContain('className="home-major-intro');
    expect(ways).toContain('className="home-major-intro');
    expect(journey).toContain('className="home-major-intro');
    expect(journey).toContain("scene-item he-card-lift");
  });
});