/**
 * PASS 4.1 — FREEZE SEMANTICS CLEANUP.
 *
 * Three narrow contracts:
 *  A/B — the Living Canvas persists through the admin screen and keeps the
 *        FROZEN anchor's metadata, never a post-freeze resolver identity;
 *  C   — the current route's own coordinates win over a fresh resolver;
 *  D–F — untouched-anchor classification honours the frozen day.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STUDIO_V3_PHASE_ORDER } from "../curation";
import { isProvablyUntouchedCanonicalAnchor } from "../studioRouteAuthority";
import type { AuthoredRoutePoint } from "../types";

const SRC = readFileSync(resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"), "utf8");

const compositionReadyBlock = SRC.slice(
  SRC.indexOf("const COMPOSITION_READY_PHASES"),
  SRC.indexOf("const COMPOSITION_READY_PHASES") + 400,
);

/* ------------------------------------------------------------------ A --- */

describe("A — logistics is composition-ready, taste phases are not", () => {
  it("includes logistics and excludes every pre-storyboard taste phase", () => {
    const listed = compositionReadyBlock.slice(0, compositionReadyBlock.indexOf("]);"));
    expect(listed).toContain('"logistics"');
    for (const phase of ["feeling", "who", "interests", "rhythm", "refinement", "intro"]) {
      expect(listed).not.toContain(`"${phase}"`);
    }
  });

  it("logistics really comes after the reward surface, so no route leaks early", () => {
    expect(STUDIO_V3_PHASE_ORDER.indexOf("logistics")).toBeLessThan(
      STUDIO_V3_PHASE_ORDER.indexOf("storyboard"),
    );
  });
});

/* ------------------------------------------------------------------ B --- */

describe("B — frozen anchor owns Canvas metadata", () => {
  it("prefers state.tourId over a fresh resolver identity when a snapshot exists", () => {
    const block = SRC.slice(
      SRC.indexOf("PASS 4.1 — when a frozen snapshot exists"),
      SRC.indexOf("points: points.map((point)"),
    );
    expect(block).toContain("(state.committedRoutePoints?.length ?? 0) > 0");
    expect(block).toContain("state.tourId ?? resolvedLive.skeletonTourKey ?? null");
    expect(block).toContain("tourKey: anchorKey");
    expect(block).toContain("regionLabel: frozenTour?.region ?? resolvedLive.routeAreaLabel");
    expect(block).toContain("tourRegionToRegionKey(anchorTour?.region ?? null)");
    // The memo recomputes when the frozen anchor changes.
    expect(SRC).toContain("state.committedRoutePoints,\n    state.tourId,");
  });
});

/* ------------------------------------------------------------------ C --- */

describe("C — current stop coordinates beat a fresh resolver", () => {
  it("checks inline finite lat/lng before the resolved routePoints lookup", () => {
    const fn = SRC.slice(
      SRC.indexOf("function resolveRevealRouteStops("),
      SRC.indexOf("const allGeo ="),
    );
    const inlineAt = fn.indexOf("Number.isFinite(s.lat) && Number.isFinite(s.lng)");
    const resolvedAt = fn.indexOf("byLabel.get(s.label.toLowerCase())");
    const geoAt = fn.indexOf("lookupStopGeo(s.label)");
    expect(inlineAt).toBeGreaterThan(-1);
    expect(inlineAt).toBeLessThan(resolvedAt);
    expect(resolvedAt).toBeLessThan(geoAt);
    // The signature really accepts the widened current stop shape.
    expect(fn).toContain("editedStops: ReadonlyArray<{ label: string; lat?: number | null");
    // Absent coordinates stay absent — nothing is fabricated.
    expect(fn).toContain("return { label: s.label } as { label: string; lat?: number");
  });
});

/* ---------------------------------------------------------------- D–F --- */

const point = (id: string, label: string): AuthoredRoutePoint =>
  ({ label, inventoryStopId: id }) as AuthoredRoutePoint;

const CATALOG = [point("inv-1", "Mercado do Livramento"), point("inv-2", "Quinta de Alcube")];

describe("D — committed canonical route survives a post-snapshot composed signal", () => {
  it("is untouched because the fresh resolver is no longer authoritative", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        committedRoutePoints: [point("inv-1", "Mercado do Livramento"), point("inv-2", "Quinta de Alcube")],
        resolved: {
          composedRoutePoints: [point("inv-9", "Somewhere else")],
          livingAtlasLive: { liveResolution: "composed" },
        },
        catalogStops: CATALOG,
      }),
    ).toBe(true);
  });
});

describe("E — no snapshot, composed signal still fails closed", () => {
  it("returns false", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        committedRoutePoints: null,
        resolved: {
          routePoints: CATALOG,
          livingAtlasLive: { liveResolution: "composed" },
        },
        catalogStops: CATALOG,
      }),
    ).toBe(false);
  });
});

describe("F — a committed route different from catalog stays false", () => {
  it("rejects a different structural route", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        committedRoutePoints: [point("inv-1", "Mercado do Livramento"), point("inv-7", "Another stop")],
        resolved: { livingAtlasLive: { liveResolution: "anchor" } },
        catalogStops: CATALOG,
      }),
    ).toBe(false);
  });

  it("still rejects when a real edit exists on top of the snapshot", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: [point("inv-1", "Mercado do Livramento")],
        committedRoutePoints: CATALOG,
        resolved: null,
        catalogStops: CATALOG,
      }),
    ).toBe(false);
  });
});
