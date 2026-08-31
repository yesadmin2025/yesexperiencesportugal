/**
 * P0 BOOKING CLOSURE — the canonical Arrábida fallback must be a REAL
 * operational day under the EXISTING authorities: source of truth,
 * blueprint, REGION_RULES and the sovereign itinerary validator.
 */
import { describe, it, expect } from "vitest";
import {
  projectAuthoredAnchorStops,
  anchorWineryPickMin,
  anchorMaxStops,
} from "../authoredAnchorProjection";
import { resolveAuthoritativeRouteStops } from "../studioRouteAuthority";
import { alignRouteLegsToItinerary } from "@/lib/studio-v3/itineraryLegAlignment";
import { validateItinerary } from "@/lib/studio-v3/itinerary-validation";
import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";
import { REGION_RULES } from "@/data/regionRules";
import { findTour } from "@/data/signatureTours";

const ARRABIDA = "arrabida-wine-allinclusive";
const CAP = REGION_RULES.arrabida.maxStops;

/** Winery pool candidates of THIS anchor, per the source of truth. */
const POOL = ["fonseca", "piloto", "palmela", "bacalh", "catralvos"];
const strip = (label: string) =>
  label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
const isPoolWinery = (label: string) => POOL.some((k) => strip(label).includes(k));
const isLunch = (label: string) => strip(label).includes("lunch");

const catalogue = () => findTour(ARRABIDA)?.stops ?? [];
const canonical = () => projectAuthoredAnchorStops(ARRABIDA, catalogue()).points;

describe("P0-A — canonical operational fallback", () => {
  it("reads its cardinality and cap from existing authorities", () => {
    expect(anchorWineryPickMin(ARRABIDA)).toBe(2);
    expect(anchorMaxStops(ARRABIDA)).toBe(CAP);
    expect(anchorWineryPickMin("not-a-tour")).toBeNull();
  });

  it("A · never emits the raw catalogue alternatives wholesale", () => {
    const raw = catalogue();
    expect(raw.length).toBeGreaterThan(CAP);
    expect(raw.filter((s) => isPoolWinery(s.label)).length).toBeGreaterThan(2);

    const day = canonical();
    expect(day.length).toBeLessThan(raw.length);
    expect(day.map((s) => s.label)).not.toEqual(raw.map((s) => s.label));
  });

  it("B · stays within the hard region cap", () => {
    expect(canonical().length).toBeLessThanOrEqual(CAP);
    expect(canonical().length).toBeGreaterThanOrEqual(REGION_RULES.arrabida.minStops);
  });

  it("C · keeps exactly two winery choices AND the canonical lunch", () => {
    const day = canonical();
    expect(day.filter((s) => isPoolWinery(s.label))).toHaveLength(2);
    expect(day.filter((s) => isLunch(s.label))).toHaveLength(1);
  });

  it("D · no duplicate candidate masquerades as a separate mandatory visit", () => {
    const labels = canonical().map((s) => strip(s.label));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps authored order and the source's own identity fields", () => {
    const raw = catalogue();
    const day = canonical();
    const order = day.map((s) => raw.findIndex((r) => r.label === s.label));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const stop of day) {
      expect(raw).toContain(stop); // same object — coords/media/provenance intact
    }
  });

  it("fails closed (passes through, unprojected) for an anchor with no structural truth", () => {
    const points = [{ label: "A" }, { label: "B" }, { label: "C" }];
    const out = projectAuthoredAnchorStops("not-a-tour", points);
    expect(out.provable).toBe(false);
    expect(out.projected).toBe(false);
    expect(out.points).toHaveLength(3);
  });

  it("projects the catalogue fallback inside the route authority chain", () => {
    const raw = catalogue();
    const withAnchor = resolveAuthoritativeRouteStops({
      catalogStops: raw,
      anchorTourId: ARRABIDA,
    });
    expect(withAnchor.length).toBeLessThanOrEqual(CAP);
    expect(withAnchor.filter((s) => isPoolWinery(s.label))).toHaveLength(2);

    // Higher links stay sovereign — a composed/edited route is the authority.
    const composed = resolveAuthoritativeRouteStops({
      resolved: { composedRoutePoints: raw },
      catalogStops: raw,
      anchorTourId: ARRABIDA,
    });
    expect(composed).toHaveLength(raw.length);
  });
});

describe("P0-C/E,F — the same validator decides bookability", () => {
  const asStops = (labels: string[]) =>
    labels.map((label, i) => ({ key: `${i}-${label}`, label, category: "village" as const }));

  it("E · the canonical fallback can reach approved under the REAL thresholds", () => {
    const labels = canonical().map((s) => s.label);
    const result = validateItinerary({
      region: "arrabida",
      stops: asStops(labels),
      legMinutes: [25, 20, 15, 20], // realistic Setúbal/Azeitão hops
      legDistancesKm: [22, 16, 10, 14],
    });
    expect(result.metrics.stopCount).toBe(labels.length);
    expect(result.status).toBe("approved");
  });

  it("F · the old 8-stop / over-cap day is still rejected", () => {
    const labels = catalogue()
      .slice(0, 8)
      .map((s) => s.label);
    const result = validateItinerary({
      region: "arrabida",
      stops: asStops(labels),
      legMinutes: [20, 15, 15, 15, 15, 15, 15],
    });
    expect(result.status).toBe("reject");
    expect(result.failures.map((f) => f.code)).toContain("too_many_stops");
  });
});

describe("P0-C/H — route-leg contract", () => {
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

  it("H · missing or ambiguous route data stays incomplete, never approved", () => {
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

    const unaligned = validateItinerary({
      region: "arrabida",
      stops: [
        { key: "a", label: "A", category: "village" },
        { key: "b", label: "B", category: "village" },
        { key: "c", label: "C", category: "village" },
      ],
      legMinutes: null,
    });
    expect(unaligned.status).toBe("incomplete");
  });
});

describe("P0-B/G — commercial continuity still fails closed", () => {
  const moments = canonical().map((s) => ({
    label: s.label,
    inventoryStopId: null,
    blueprintStopId: null,
  }));

  it("G · an unedited canonical anchor resolves as the authored fallback", () => {
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: ARRABIDA,
      moments,
      edited: false,
    });
    expect(authority.liveResolution).toBe("authored-fallback");
  });

  it("G · an unknown moment never becomes silently priceable", () => {
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: ARRABIDA,
      moments: [...moments, { label: "Totally invented private yacht", inventoryStopId: null, blueprintStopId: null }],
      edited: true,
    });
    expect(authority.liveResolution).not.toBe("composed-priced");
  });
});
