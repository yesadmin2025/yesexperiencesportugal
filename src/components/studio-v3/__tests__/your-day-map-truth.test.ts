import { describe, expect, it } from "vitest";
import { resolveYourDayMapTruth } from "../yourDayMapTruth";

const lisbon = { lat: 38.7223, lng: -9.1393 };
const sintra = { lat: 38.7979, lng: -9.3907 };
const evora = { lat: 38.5714, lng: -7.9135 };

describe("resolveYourDayMapTruth", () => {
  it("shows a geographic map when every moment has real, coherent coordinates", () => {
    const truth = resolveYourDayMapTruth([
      { label: "Lisbon", ...lisbon },
      { label: "Sintra", ...sintra },
      { label: "Evora", ...evora },
    ]);
    expect(truth.mode).toBe("map");
    expect(truth.stops.map((s) => s.label)).toEqual(["Lisbon", "Sintra", "Evora"]);
    // Pin order mirrors moment order exactly.
    expect(truth.stops.map((s) => s.position)).toEqual([1, 2, 3]);
  });

  it("never claims a route line unless routed geometry is supplied", () => {
    const withoutGeometry = resolveYourDayMapTruth([
      { label: "Lisbon", ...lisbon },
      { label: "Sintra", ...sintra },
    ]);
    expect(withoutGeometry.hasRouteGeometry).toBe(false);

    const withGeometry = resolveYourDayMapTruth(
      [
        { label: "Lisbon", ...lisbon },
        { label: "Sintra", ...sintra },
      ],
      { hasRouteGeometry: true },
    );
    expect(withGeometry.hasRouteGeometry).toBe(true);
  });

  it("falls back to the timeline when a single moment is missing coordinates", () => {
    const truth = resolveYourDayMapTruth([
      { label: "Lisbon", ...lisbon },
      { label: "A cellar", lat: null, lng: null },
      { label: "Sintra", ...sintra },
    ]);
    expect(truth.mode).toBe("timeline");
    expect(truth.reason).toBe("incomplete-coordinates");
    expect(truth.stops).toEqual([]);
  });

  it("falls back to the timeline with fewer than two plottable moments", () => {
    expect(resolveYourDayMapTruth([]).reason).toBe("no-moments");
    expect(resolveYourDayMapTruth([{ label: "Lisbon", ...lisbon }]).reason).toBe(
      "too-few-coordinates",
    );
  });

  it("rejects incoherent geography instead of drawing it", () => {
    // Outside mainland Portugal -> not a coordinate we will plot.
    const offshore = resolveYourDayMapTruth([
      { label: "Lisbon", ...lisbon },
      { label: "Paris", lat: 48.8566, lng: 2.3522 },
    ]);
    expect(offshore.mode).toBe("timeline");

    // Duplicated pins would stack into an unreadable map.
    const duplicated = resolveYourDayMapTruth([
      { label: "Lisbon", ...lisbon },
      { label: "Lisbon again", ...lisbon },
    ]);
    expect(duplicated.reason).toBe("incoherent-span");
  });
});
