import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const tourRoute = read("src/routes/tours.$tourId.tsx");
const styles = read("src/styles.css");
const home = read("src/routes/index.tsx");
const journey = read("src/components/home/RecentJourney.tsx");
const proposal = read("src/routes/proposal-in-portugal.tsx");
const composition = read("src/components/booking/CompositionField.tsx");

describe("decorative gold ornament removed", () => {
  it("Signature itinerary no longer renders the RouteThread ornament", () => {
    expect(tourRoute).not.toMatch(/RouteThread/);
  });

  it("itinerary ordinals are neutral, not gold", () => {
    const itinerary = tourRoute.slice(tourRoute.indexOf("function ItineraryTimeline"));
    expect(itinerary).toMatch(/text-\[color:var\(--charcoal-soft\)\]\/75/);
    expect(itinerary).not.toMatch(/--gold-ink/);
  });

  it("public eyebrow rules are a neutral hairline, not gold", () => {
    const idx = styles.indexOf("\n  .he-eyebrow-bar::before {\n    content:");
    const bar = styles.slice(idx > -1 ? idx : styles.indexOf(".he-eyebrow-bar::before"));
    const block = bar.slice(0, bar.indexOf("}") + 1);
    expect(block).toMatch(/color-mix\(in oklab, var\(--charcoal\)/);
    expect(block).not.toMatch(/--gold/);
  });

  it("proposal hero eyebrow is not bracketed and local notes use a neutral border", () => {
    expect(proposal).toMatch(/<Eyebrow>Proposal in Portugal<\/Eyebrow>/);
    expect(proposal).not.toMatch(/border-l-2 border-\[color:var\(--gold\)\]/);
  });

  it("the Add a child affordance is no longer a gold underline", () => {
    expect(composition).not.toMatch(/border-b border-\[color:var\(--gold\)\]/);
    expect(composition).toMatch(/border-b border-\[color:var\(--teal\)\]\/45/);
  });
});

describe("shared public label -> title breath contract", () => {
  it("is owned by one shared selector at 1.5rem (24px)", () => {
    const contract = styles.slice(styles.indexOf("VISUAL STORYTELLING SYSTEM"));
    expect(contract).toMatch(/\.editorial-chapter-open/);
    expect(contract).toMatch(/margin-top: 1\.5rem/);
    expect(contract).toMatch(/margin-bottom: 0/);
  });

  it("tour and route-map chapter openers opt into the contract", () => {
    expect(tourRoute.match(/editorial-chapter-open/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(read("src/components/SignatureRouteMap.tsx")).toMatch(/editorial-chapter-open/);
    expect(read("src/components/SignatureRouteMapShell.tsx")).toMatch(/editorial-chapter-open/);
  });
});

describe("homepage story motion", () => {
  it("Signature title reveals as two intentional lines", () => {
    expect(home).toMatch(/home-story-intro/);
    const block = home.slice(home.indexOf('id="signatures-title"'));
    expect(block).toMatch(/"Signature days,"/);
    expect(block).toMatch(/already loved\./);
  });

  it("Travel Designer title reveals as two lines and support copy in two beats", () => {
    expect(journey).toMatch(/home-story-intro/);
    expect(journey).toMatch(/"A Portugal"/);
    expect(journey).toMatch(/written around you\./);
    expect(journey.match(/story-beat/g)?.length ?? 0).toBe(2);
    expect(journey).toMatch(/Multi-day Portugal, composed by a local —/);
    expect(journey).toMatch(/delivered as a book, not a booking\./);
  });

  it("the travel file arrives after the copy and pillars stagger", () => {
    expect(journey).toMatch(/travel-file-settle/);
    expect(journey).toMatch(/home-pillars/);
    const contract = styles.slice(styles.indexOf("VISUAL STORYTELLING SYSTEM"));
    expect(contract).toMatch(/transition-duration: 780ms/);
    expect(contract).toMatch(/translate3d\(0, 26px, 0\)/);
    expect(contract).toMatch(/translate3d\(0, 32px, 0\)/);
    expect(contract).toMatch(/120ms/);
  });

  it("reduced motion resolves to the final state immediately", () => {
    const contract = styles.slice(styles.indexOf("VISUAL STORYTELLING SYSTEM"));
    const reduced = contract.slice(contract.indexOf("prefers-reduced-motion"));
    expect(reduced).toMatch(/opacity: 1/);
    expect(reduced).toMatch(/clip-path: none/);
    expect(reduced).toMatch(/transform: none/);
    expect(reduced).toMatch(/transition-delay: 0ms/);
  });
});
