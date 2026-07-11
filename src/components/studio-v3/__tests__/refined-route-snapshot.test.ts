/**
 * Pass 1B §1b + §9 — Signed snapshot uses the refined route, never
 * `tour.stops`.
 *
 * Given a resolved Studio route AND a deliberately different static
 * `tour.stops` array, the snapshot builder must emit the refined stops.
 */
import { describe, it, expect } from "vitest";
import {
  canonicalConfirmedStops,
  slugifyStopLabel,
} from "@/lib/studio-v3/canonicalRouteStops";
import type { StudioV3State } from "@/components/studio-v3/types";

// Minimal StudioV3State shape sufficient for canonicalConfirmedStops.
// (feeling/companions/interests/pickup drive resolveStudioV3Route → we
// override the resolved output via editedRoutePoints, which is the exact
// mechanism the Refine phase uses.)
function stateWithRefinedStops(
  editedLabels: string[] | null,
): StudioV3State {
  return {
    feeling: "curious-explorer",
    companions: "couple",
    occasion: null,
    dateFlex: "flex-week",
    dateExact: null,
    pickup: "lisbon-hotel",
    languages: ["en"],
    interests: ["wine", "history"],
    rhythm: "gentle",
    considerations: [],
    accessibility: null,
    investment: "signature",
    budget: null,
    destinationIntent: "no-preference",
    journeyTitle: null,
    tourId: "azeitao-cheese",
    editedRoutePoints:
      editedLabels === null
        ? null
        : editedLabels.map((label) => ({ label, story: "" })),
  } as unknown as StudioV3State;
}

describe("§1b — canonicalConfirmedStops uses refined route, not tour.stops", () => {
  it("golden fixture: refined stops are exactly the four confirmed", () => {
    const stops = canonicalConfirmedStops(
      stateWithRefinedStops([
        "Mercado do Livramento",
        "Azulejos de Azeitão",
        "Bacalhôa Vinhos de Portugal",
        "Castelo de Sesimbra",
      ]),
    );
    expect(stops.map((s) => s.label)).toEqual([
      "Mercado do Livramento",
      "Azulejos de Azeitão",
      "Bacalhôa Vinhos de Portugal",
      "Castelo de Sesimbra",
    ]);
    // Stable slug ids (mirrored across every downstream surface).
    expect(stops.map((s) => s.id)).toEqual([
      "mercado-do-livramento",
      "azulejos-de-azeitao",
      "bacalhoa-vinhos-de-portugal",
      "castelo-de-sesimbra",
    ]);
  });

  it("refined reorder wins: edited order is preserved end-to-end", () => {
    const stops = canonicalConfirmedStops(
      stateWithRefinedStops([
        "Castelo de Sesimbra",
        "Bacalhôa Vinhos de Portugal",
        "Azulejos de Azeitão",
        "Mercado do Livramento",
      ]),
    );
    expect(stops[0].label).toBe("Castelo de Sesimbra");
    expect(stops[3].label).toBe("Mercado do Livramento");
  });

  it("refined removal wins: a removed stop is absent from the snapshot", () => {
    const stops = canonicalConfirmedStops(
      stateWithRefinedStops([
        "Mercado do Livramento",
        "Bacalhôa Vinhos de Portugal",
        "Castelo de Sesimbra",
      ]),
    );
    expect(stops.map((s) => s.label)).not.toContain("Azulejos de Azeitão");
    expect(stops).toHaveLength(3);
  });

  it("bounded to first 4 (mirrors numbered final itinerary)", () => {
    const stops = canonicalConfirmedStops(
      stateWithRefinedStops([
        "One",
        "Two",
        "Three",
        "Four",
        "Five (alternative — must be excluded)",
      ]),
    );
    expect(stops).toHaveLength(4);
    expect(stops.map((s) => s.label)).not.toContain(
      "Five (alternative — must be excluded)",
    );
  });

  it("slug helper is deterministic and diacritic-safe", () => {
    expect(slugifyStopLabel("Azulejos de Azeitão")).toBe("azulejos-de-azeitao");
    expect(slugifyStopLabel("Bacalhôa Vinhos de Portugal")).toBe(
      "bacalhoa-vinhos-de-portugal",
    );
    // Stable across calls.
    expect(slugifyStopLabel("Mercado do Livramento")).toBe(
      slugifyStopLabel("Mercado do Livramento"),
    );
  });

  it("static tour.stops divergence is irrelevant: builder never reads tour", () => {
    // The helper signature accepts only StudioV3State — it cannot read
    // `tour.stops` even if a caller wanted to leak them.
    const refined = ["Refined A", "Refined B"];
    const staticTourStops = [
      { label: "Static Catalogue X" },
      { label: "Static Catalogue Y" },
    ];
    const stops = canonicalConfirmedStops(stateWithRefinedStops(refined));
    expect(stops.map((s) => s.label)).toEqual(refined);
    // Sanity: static labels never leak in.
    for (const s of stops) {
      expect(staticTourStops.map((x) => x.label)).not.toContain(s.label);
    }
  });
});
