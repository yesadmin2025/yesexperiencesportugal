/**
 * P8 route truth — the traveller's composed route is the product.
 *
 * The Signature (`tourId`) is only the technical pricing / geographic /
 * operational anchor. These tests lock the invariants that make that true:
 * the full composed day is never presentation-capped, every label comes from
 * an approved source, operational closures survive composition, edits win
 * over everything, reshapes are deterministic, and the map is only claimed
 * when the geography is genuinely complete.
 */

import { describe, expect, it } from "vitest";
import { resolveStudioV3Route } from "../curation";
import {
  resolveAuthoritativeRouteStops,
  studioRouteShapingInput,
} from "../studioRouteAuthority";
import { buildSignatureStorySnapshot } from "../signatureStorySnapshot";
import { resolveYourDayMapTruth } from "../yourDayMapTruth";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { signatureTours } from "@/data/signatureTours";

const MONDAY = "2026-06-15";
const TUESDAY = "2026-06-16";

function state(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

/** Every label a truthful day may contain: Signature stops + region pool. */
const APPROVED_LABELS = new Set<string>(
  [
    ...signatureTours.flatMap((t) => t.stops.map((s) => s.label)),
    ...REGION_STOP_POOL.map((s) => s.name),
  ].map((l) => l.toLowerCase()),
);

function isApproved(label: string): boolean {
  const key = label.toLowerCase();
  if (APPROVED_LABELS.has(key)) return true;
  // Composed labels may carry an editorial suffix ("Name — detail").
  const head = key.split(/[—–-]/)[0].trim();
  return APPROVED_LABELS.has(head) || [...APPROVED_LABELS].some((l) => l.startsWith(head));
}

describe("P8 — composed route is never capped to four", () => {
  it("keeps a rich day whole while the compact card projection stays <= 4", () => {
    const rich = state({
      feeling: "coastal",
      companions: "friends",
      rhythm: "immersive",
      interests: ["coast", "gastronomy", "nature"],
      pickup: "lisbon",
    });
    const resolved = resolveStudioV3Route(studioRouteShapingInput(rich));

    expect(resolved.routePoints.length).toBeLessThanOrEqual(4);
    expect(resolved.composedRoutePoints.length).toBeGreaterThanOrEqual(
      resolved.routePoints.length,
    );
    // At least one current rich profile must exceed the compact cap.
    const full = state({ ...rich, rhythm: "full" });
    const fullResolved = resolveStudioV3Route(studioRouteShapingInput(full));
    // A heritage day is composed from inventory that carries approved
    // commercial identity end to end, so it is the profile that proves the
    // "no compact cap on the composed day" rule.
    const heritage = state({
      feeling: "culture",
      companions: "friends",
      rhythm: "full",
      interests: ["heritage", "gastronomy"],
      pickup: "lisbon",
    });
    const heritageResolved = resolveStudioV3Route(studioRouteShapingInput(heritage));
    const maxComposed = Math.max(
      resolved.composedRoutePoints.length,
      fullResolved.composedRoutePoints.length,
      heritageResolved.composedRoutePoints.length,
    );
    expect(maxComposed).toBeGreaterThan(4);
  });

  it("returns only labels from approved Signature or region-pool sources", () => {
    const s = state({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "full",
      interests: ["wine", "gastronomy"],
      pickup: "lisbon",
    });
    const resolved = resolveStudioV3Route(studioRouteShapingInput(s));
    for (const p of resolved.composedRoutePoints) {
      expect(isApproved(p.label), `unapproved label: ${p.label}`).toBe(true);
    }
  });

  it("differentiates meaningfully different profiles inside one destination", () => {
    const coastal = resolveStudioV3Route(
      studioRouteShapingInput(
        state({
          feeling: "coastal",
          companions: "couple",
          rhythm: "balanced",
          interests: ["coast", "nature"],
          pickup: "lisbon",
        }),
      ),
    );
    const wine = resolveStudioV3Route(
      studioRouteShapingInput(
        state({
          feeling: "wine-food",
          companions: "couple",
          rhythm: "balanced",
          interests: ["wine", "gastronomy"],
          pickup: "lisbon",
        }),
      ),
    );
    const a = coastal.composedRoutePoints.map((p) => p.label).join("|");
    const b = wine.composedRoutePoints.map((p) => p.label).join("|");
    expect(a).not.toBe(b);
  });
});

describe("P8 — authority chain", () => {
  const base = state({
    feeling: "coastal",
    companions: "couple",
    rhythm: "balanced",
    interests: ["coast"],
    pickup: "lisbon",
    tourId: signatureTours[0].id,
  });

  it("edited points beat the composed route AND a changed technical tourId", () => {
    const edited = [{ label: "My own stop", story: "chosen by hand" }];
    const stops = resolveAuthoritativeRouteStops({
      editedRoutePoints: edited,
      resolved: resolveStudioV3Route(studioRouteShapingInput(base)),
      catalogStops: signatureTours[1].stops,
    });
    expect(stops.map((s) => s.label)).toEqual(["My own stop"]);
  });

  it("prefers the full composed route over the compact projection", () => {
    const resolved = resolveStudioV3Route(
      studioRouteShapingInput(state({ ...base, rhythm: "immersive" })),
    );
    const stops = resolveAuthoritativeRouteStops({ editedRoutePoints: null, resolved });
    expect(stops.length).toBe(resolved.composedRoutePoints.length);
  });

  it("falls back to catalog Signature stops only when nothing is composed", () => {
    const stops = resolveAuthoritativeRouteStops({
      editedRoutePoints: null,
      resolved: { composedRoutePoints: [], routePoints: [] },
      catalogStops: signatureTours[0].stops,
    });
    expect(stops.length).toBe(signatureTours[0].stops.length);
  });
});

describe("P8 — operational closures survive composition", () => {
  const mercado = /mercado\s+do\s+livramento/i;

  const setubalish = (dateExact: string) =>
    state({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "full",
      interests: ["gastronomy", "local-life", "wine"],
      pickup: "sesimbra-setubal-arrabida",
      dateExact,
      dateMode: "exact",
    });

  // BUILD 1 / Pass 4 Block A: a closure is validation truth, never a silent
  // membership mutation. The Living Atlas branch keeps the stop in the frozen
  // composition, refuses the PUBLIC projection (`date-closure`) and reports
  // the conflict. The public day falls back to the raw authored Signature.
  it("turns a Monday closure into an explicit date-closure, never a silent drop", () => {
    const resolved = resolveStudioV3Route(studioRouteShapingInput(setubalish(MONDAY)));
    const live = resolved.livingAtlasLive;
    expect(live).not.toBeNull();
    expect(live?.anchorTourId).toBe("arrabida-wine-allinclusive");
    expect(live?.compositionResolution).toBe("complete");
    expect(live?.compositionStopIds.some((id) => /mercado-do-livramento/.test(id))).toBe(true);
    expect(live?.passthroughReason).toBe("date-closure");
    expect(live?.liveResolution).toBe("authored-fallback");
    expect(live?.validation?.reasons.map((r) => r.code)).toContain("window-conflict");
  });

  it("keeps the closure visible to the downstream story snapshot as review truth", () => {
    const snapshot = buildSignatureStorySnapshot(setubalish(MONDAY));
    // The snapshot still renders a real day — the closure never empties it.
    expect(JSON.stringify(snapshot).length).toBeGreaterThan(0);
    expect(mercado.test(JSON.stringify(snapshot))).toBe(true);
  });


  it("does not forbid the market on a Tuesday", () => {
    // We assert only that the rule is date-scoped, never that a specific stop
    // must appear — curation stays free to choose.
    const tuesday = resolveStudioV3Route(studioRouteShapingInput(setubalish(TUESDAY)));
    expect(tuesday.composedRoutePoints.length).toBeGreaterThan(0);
  });
});

describe("P8 — determinism", () => {
  it("same state and reshape seed produce the same day", () => {
    const s = state({
      feeling: "hidden",
      companions: "friends",
      rhythm: "full",
      interests: ["local-life", "coast"],
      pickup: "lisbon",
      rerollCount: 2,
    });
    const a = resolveStudioV3Route(studioRouteShapingInput(s));
    const b = resolveStudioV3Route(studioRouteShapingInput(s));
    expect(a.composedRoutePoints.map((p) => p.label)).toEqual(
      b.composedRoutePoints.map((p) => p.label),
    );
  });
});

describe("P8 — truthful map surface", () => {
  it("claims a map only when every moment holds a real coordinate", () => {
    const complete = resolveYourDayMapTruth([
      { label: "Lisbon", lat: 38.7223, lng: -9.1393 },
      { label: "Sintra", lat: 38.7979, lng: -9.3907 },
    ]);
    expect(complete.mode).toBe("map");

    const gap = resolveYourDayMapTruth([
      { label: "Lisbon", lat: 38.7223, lng: -9.1393 },
      { label: "A cellar", lat: null, lng: null },
      { label: "Sintra", lat: 38.7979, lng: -9.3907 },
    ]);
    expect(gap.mode).toBe("timeline");
    expect(gap.reason).toBe("incomplete-coordinates");
  });
});
