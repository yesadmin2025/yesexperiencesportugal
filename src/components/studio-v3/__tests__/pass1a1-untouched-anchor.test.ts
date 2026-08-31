import { describe, expect, it } from "vitest";

import { findTour } from "@/data/signatureTours";
import {
  isProvablyUntouchedCanonicalAnchor,
  resolveAuthoritativeRouteStops,
} from "../studioRouteAuthority";
import { resolveStudioV3Route } from "../curation";
import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";

/**
 * PASS 1A.1 — the untouched-canonical-anchor certification hole.
 *
 * `edited: editedRoutePoints.length > 0` was insufficient: the resolver can
 * compose / replace / add moments automatically while `editedRoutePoints` is
 * still null, so an automatically composed route could be misclassified as an
 * untouched canonical anchor and receive the no-blueprint exception.
 */

const catalog = [
  { label: "Arrábida viewpoint", story: "" },
  { label: "Cellar tasting", story: "" },
  { label: "Setúbal market", story: "" },
];

describe("PASS 1A.1 — isProvablyUntouchedCanonicalAnchor", () => {
  it("A. classifies an automatic composed route as edited even with editedRoutePoints null", () => {
    const untouched = isProvablyUntouchedCanonicalAnchor({
      editedRoutePoints: null,
      resolved: {
        composedRoutePoints: [
          { label: "Arrábida viewpoint" },
          { label: "A different winery" },
          { label: "Setúbal market" },
        ],
        routePoints: catalog,
      },
      catalogStops: catalog,
    });
    expect(untouched).toBe(false);
  });

  it("A2. an automatic ADDITION with no manual edits is not untouched", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        resolved: { composedRoutePoints: [...catalog, { label: "Extra moment" }] },
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("A3. an automatic REMOVAL with no manual edits is not untouched", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        resolved: { composedRoutePoints: catalog.slice(0, 2) },
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("A4. a REORDER of the same membership is not untouched", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        resolved: { composedRoutePoints: [catalog[1]!, catalog[0]!, catalog[2]!] },
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("C. Living Atlas liveResolution 'composed' is never untouched, even when labels match", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        resolved: {
          composedRoutePoints: catalog,
          livingAtlasLive: { liveResolution: "composed" },
        },
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("D. exact canonical catalog route with no manual edits is untouched", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        resolved: {
          routePoints: catalog.map((s) => ({ label: s.label })),
          livingAtlasLive: { liveResolution: "authored-fallback" },
        },
        catalogStops: catalog,
      }),
    ).toBe(true);
  });

  it("D2. manual edits always disqualify", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: catalog.map((s) => ({ label: s.label })),
        resolved: { routePoints: catalog },
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("E. thin/unknown data fails closed", () => {
    expect(isProvablyUntouchedCanonicalAnchor({})).toBe(false);
    expect(
      isProvablyUntouchedCanonicalAnchor({ resolved: { routePoints: catalog }, catalogStops: [] }),
    ).toBe(false);
    expect(
      isProvablyUntouchedCanonicalAnchor({
        resolved: { routePoints: [{ label: "" }, { label: "" }, { label: "" }] },
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("E2. prefers structural ids when both sides genuinely carry them", () => {
    const withIds = [
      { label: "Arrábida viewpoint", inventoryStopId: "stop-a" },
      { label: "Cellar tasting", inventoryStopId: "stop-b" },
    ];
    expect(
      isProvablyUntouchedCanonicalAnchor({
        resolved: { routePoints: withIds },
        catalogStops: withIds,
      }),
    ).toBe(true);
    // Same labels, different structural identity => not the canonical anchor.
    expect(
      isProvablyUntouchedCanonicalAnchor({
        resolved: {
          routePoints: [withIds[0]!, { label: "Cellar tasting", inventoryStopId: "stop-z" }],
        },
        catalogStops: withIds,
      }),
    ).toBe(false);
  });
});

describe("PASS 1A.1 — no-blueprint exception is gated by the helper", () => {
  it("B. real resolver output: the chosen valid input resolves the canonical anchor and keeps the exception", () => {
    // Truthful statement about the CURRENT architecture: for this valid input,
    // resolveStudioV3Route returns the exact canonical anchor (no automatic
    // composition). The untouched classification and the no-blueprint
    // authored-fallback exception must therefore remain allowed.
    const resolved = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      occasion: null,
      considerations: [],
      investment: null,
      destinationIntent: null,
      dateExact: null,
      refinement: null,
      questionHistory: [],
      seed: 0,
    });
    const tour = resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null;
    expect(tour).toBeTruthy();

    const stops = resolveAuthoritativeRouteStops({
      editedRoutePoints: null,
      resolved,
      catalogStops: tour?.stops ?? null,
    });
    expect(stops.length).toBeGreaterThan(1);

    const untouched = isProvablyUntouchedCanonicalAnchor({
      editedRoutePoints: null,
      resolved,
      catalogStops: tour?.stops ?? null,
    });

    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: tour?.id ?? null,
      moments: stops.map((s) => ({
        label: s.label,
        inventoryStopId: s.inventoryStopId ?? null,
        blueprintStopId: s.blueprintStopId ?? null,
      })),
      edited: !untouched,
    });

    expect(untouched).toBe(true);
    expect(authority.liveResolution).toBe("authored-fallback");
  });

  it("B2. SIMULATED composed route (constructed, not a real resolver emission) is NOT untouched", () => {
    // Pure route-authority case: we CONSTRUCT a divergent composedRoutePoints
    // with editedRoutePoints null to model what legacy automatic composition
    // would produce. The current resolver does not itself emit this for the
    // input above — this test certifies the authority helper, not the
    // resolver's current behaviour.
    const resolved = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
      occasion: null,
      considerations: [],
      investment: null,
      destinationIntent: null,
      dateExact: null,
      refinement: null,
      questionHistory: [],
      seed: 0,
    });
    const tour = resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null;
    expect(tour).toBeTruthy();

    const stops = resolveAuthoritativeRouteStops({
      editedRoutePoints: null,
      resolved,
      catalogStops: tour?.stops ?? null,
    });

    const autoComposed = {
      ...resolved,
      composedRoutePoints: stops.map((s, i) =>
        i === 1 ? { ...s, label: `${s.label} (alternative)` } : s,
      ),
    };
    const autoUntouched = isProvablyUntouchedCanonicalAnchor({
      editedRoutePoints: null,
      resolved: autoComposed,
      catalogStops: tour?.stops ?? null,
    });
    expect(autoUntouched).toBe(false);
    expect(
      rebuildLiveCommercialAuthority({
        anchorTourId: tour?.id ?? null,
        moments: resolveAuthoritativeRouteStops({
          editedRoutePoints: null,
          resolved: autoComposed,
          catalogStops: tour?.stops ?? null,
        }).map((s) => ({
          label: s.label,
          inventoryStopId: s.inventoryStopId ?? null,
          blueprintStopId: s.blueprintStopId ?? null,
        })),
        edited: !autoUntouched,
      }).liveResolution,
    ).toBe("composed");
  });

  it("B2. a composed legacy no-blueprint route is not silently safe", () => {
    const authority = rebuildLiveCommercialAuthority({
      anchorTourId: "arrabida-wine-allinclusive",
      moments: [{ label: "Some moment" }, { label: "Another moment" }],
      edited: true,
    });
    expect(authority.liveResolution).toBe("composed");
    expect(authority.safe).toBe(false);
  });
});
