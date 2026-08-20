import { describe, expect, it } from "vitest";
import {
  describeRoute,
  filterItineraryStops,
  foldForSearch,
  parseStopAnchor,
  resolveItineraryGeoStops,
  routeMatchesStops,
  stopAnchorId,
  unmappedStops,
  type ItineraryGeoStop,
} from "@/lib/itinerary-view";

const stops = [
  { order: 1, label: "Baía de Setúbal — Sado ferry crossing", note: null },
  { order: 2, label: "Roman Ruins of Tróia", note: "Ruins by the water." },
  { order: 3, label: "Herdade da Comporta", note: "Wine tasting." },
];

describe("foldForSearch", () => {
  it("strips accents and case", () => {
    expect(foldForSearch("Tróia")).toBe("troia");
    expect(foldForSearch("  Baía   de  Setúbal ")).toBe("baia de setubal");
  });
});

describe("filterItineraryStops", () => {
  it("returns every stop for an empty query", () => {
    expect(filterItineraryStops(stops, "")).toHaveLength(3);
    expect(filterItineraryStops(stops, "   ")).toHaveLength(3);
  });

  it("matches accented names typed without accents", () => {
    expect(filterItineraryStops(stops, "troia").map((s) => s.order)).toEqual([2]);
    expect(filterItineraryStops(stops, "setubal").map((s) => s.order)).toEqual([1]);
  });

  it("matches notes as well as labels", () => {
    expect(filterItineraryStops(stops, "tasting").map((s) => s.order)).toEqual([3]);
  });

  it("returns nothing for an unknown name", () => {
    expect(filterItineraryStops(stops, "porto")).toEqual([]);
  });

  it("preserves the original order", () => {
    expect(filterItineraryStops(stops, "a").map((s) => s.order)).toEqual([1, 2, 3]);
  });
});

describe("stop anchors", () => {
  it("builds stable ids", () => {
    expect(stopAnchorId(3)).toBe("stop-3");
  });

  it("parses deep-link hashes", () => {
    expect(parseStopAnchor("#stop-3")).toBe(3);
    expect(parseStopAnchor("stop-12")).toBe(12);
    expect(parseStopAnchor("#STOP-2")).toBe(2);
  });

  it("rejects anything else", () => {
    expect(parseStopAnchor("#included")).toBeNull();
    expect(parseStopAnchor("#stop-0")).toBeNull();
    expect(parseStopAnchor("")).toBeNull();
    expect(parseStopAnchor(null)).toBeNull();
  });
});

describe("resolveItineraryGeoStops", () => {
  it("keeps the printed number on the placed pins", () => {
    const geo = resolveItineraryGeoStops(stops);
    expect(geo.length).toBeGreaterThan(0);
    for (const stop of geo) {
      expect(stops.some((s) => s.order === stop.order && s.label === stop.label)).toBe(true);
      expect(Number.isFinite(stop.lat)).toBe(true);
      expect(Number.isFinite(stop.lng)).toBe(true);
    }
    // Order is never reshuffled.
    expect(geo.map((s) => s.order)).toEqual([...geo.map((s) => s.order)].sort((a, b) => a - b));
  });

  it("never invents a coordinate for an unknown label", () => {
    const geo = resolveItineraryGeoStops([
      { order: 1, label: "A place that does not exist anywhere", note: null },
    ]);
    expect(geo).toEqual([]);
  });

  it("reports unplaced stops so the list can note them", () => {
    const input = [...stops, { order: 4, label: "Zzz unknown place", note: null }];
    const geo = resolveItineraryGeoStops(input);
    expect(unmappedStops(input, geo).map((s) => s.order)).toContain(4);
  });
});

describe("routeMatchesStops", () => {
  const geo: ItineraryGeoStop[] = [
    { order: 1, label: "Roman Ruins of Tróia", lat: 38.48, lng: -8.89 },
    { order: 2, label: "Herdade da Comporta", lat: 38.37, lng: -8.79 },
  ];

  it("accepts the same places in the same order", () => {
    expect(routeMatchesStops(["Roman Ruins of Troia", "Herdade da Comporta"], geo)).toBe(true);
  });

  it("rejects a different length or a different order", () => {
    expect(routeMatchesStops(["Herdade da Comporta", "Roman Ruins of Tróia"], geo)).toBe(false);
    expect(routeMatchesStops(["Roman Ruins of Tróia"], geo)).toBe(false);
    expect(routeMatchesStops([], geo)).toBe(false);
  });
});

describe("describeRoute", () => {
  it("lists the stops in order for screen readers", () => {
    const text = describeRoute([
      { order: 1, label: "Marina de Tróia", lat: 38.49, lng: -8.89 },
      { order: 2, label: "Comporta", lat: 38.38, lng: -8.78 },
    ]);
    expect(text).toContain("1. Marina de Tróia");
    expect(text.indexOf("1. Marina")).toBeLessThan(text.indexOf("2. Comporta"));
  });

  it("stays honest when nothing could be placed", () => {
    expect(describeRoute([])).toContain("No stop could be placed");
  });
});
