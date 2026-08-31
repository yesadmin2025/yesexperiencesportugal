import { describe, it, expect } from "vitest";
import { projectAuthoredAnchorStops, anchorWineryPickMin } from "../authoredAnchorProjection";
import { resolveAuthoritativeRouteStops } from "../studioRouteAuthority";
import { alignRouteLegsToItinerary } from "@/lib/studio-v3/itineraryLegAlignment";
import { findTour } from "@/data/signatureTours";

const ARRABIDA = "arrabida-wine-allinclusive";

/** Pool candidates of THIS anchor, per the source of truth. */
const POOL = ["fonseca", "piloto", "palmela", "bacalh", "catralvos"];
const isPoolWinery = (label: string) =>
  POOL.some((k) => label.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").includes(k));

describe("P0-A — authored anchor projection (no raw catalogue day)", () => {
  it("knows the canonical pool minimum from existing truth", () => {
    expect(anchorWineryPickMin(ARRABIDA)).toBe(2);
    expect(anchorWineryPickMin("not-a-tour")).toBeNull();
  });

  it("collapses the Arrábida catalogue to the canonical winery cardinality", () => {
    const stops = findTour(ARRABIDA)?.stops ?? [];
    expect(stops.length).toBeGreaterThan(4);
    const raw = stops.filter((s) => isPoolWinery(s.label)).length;
    expect(raw).toBeGreaterThan(2);

    const projected = projectAuthoredAnchorStops(ARRABIDA, stops);
    expect(projected.projected).toBe(true);
    expect(projected.points.filter((s) => isPoolWinery(s.label))).toHaveLength(2);
    expect(projected.droppedLabels).toHaveLength(raw - 2);
    // Non-pool moments survive untouched, in order.
    const nonPool = (list: ReadonlyArray<{ label: string }>) =>
      list.filter((s) => !isPoolWinery(s.label)).map((s) => s.label);
    expect(nonPool(projected.points)).toEqual(nonPool(stops));
  });

  it("never drops candidates when the anchor already matches (or under-delivers)", () => {
    const two = [{ label: "Quinta do Piloto" }, { label: "Bacalhôa" }, { label: "Azeitão" }];
    expect(projectAuthoredAnchorStops(ARRABIDA, two).points).toHaveLength(3);
    expect(projectAuthoredAnchorStops(null, two).points).toHaveLength(3);
  });

  it("projects the catalogue fallback of the authority chain when the anchor is known", () => {
    const stops = findTour(ARRABIDA)?.stops ?? [];
    const withAnchor = resolveAuthoritativeRouteStops({
      catalogStops: stops,
      anchorTourId: ARRABIDA,
    });
    expect(withAnchor.filter((s) => isPoolWinery(s.label))).toHaveLength(2);
    // Higher links in the chain are never projected — a composed/edited route
    // is already the authority.
    const composed = resolveAuthoritativeRouteStops({
      resolved: { composedRoutePoints: stops },
      catalogStops: stops,
      anchorTourId: ARRABIDA,
    });
    expect(composed).toHaveLength(stops.length);
  });
});

describe("P0-C — route-leg contract", () => {
  const keys = ["0-A", "1-B", "2-C"];

  it("drops the pickup leg so legs match stops - 1", () => {
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys: ["origin", ...keys],
        legMinutes: [40, 12, 18],
        itineraryStopKeys: keys,
      }),
    ).toEqual([12, 18]);
  });

  it("gives a deduped (identical-coordinate) moment a truthful 0-minute leg", () => {
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys: ["origin", "0-A", "2-C"],
        legMinutes: [40, 25],
        itineraryStopKeys: keys,
      }),
    ).toEqual([0, 25]);
  });

  it("fails closed on missing, short or non-monotonic data", () => {
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys: ["origin", ...keys],
        legMinutes: null,
        itineraryStopKeys: keys,
      }),
    ).toBeNull();
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys: ["origin", ...keys],
        legMinutes: [40, 12],
        itineraryStopKeys: keys,
      }),
    ).toBeNull();
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys: ["origin", "2-C", "1-B", "0-A"],
        legMinutes: [40, 12, 18],
        itineraryStopKeys: keys,
      }),
    ).toBeNull();
  });
});
