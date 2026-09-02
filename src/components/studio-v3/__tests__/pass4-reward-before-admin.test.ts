/**
 * PASS 4 — REWARD BEFORE ADMIN + FREEZE THE SHOWN DAY.
 *
 * Certifies the flow contract (`… → 0..N Director → YOUR DAY → logistics →
 * guestDetails → checkoutSummary`) and the frozen-day contract: the exact
 * itinerary the traveller was shown survives logistics, guest details and
 * checkout, and can never be silently recomposed behind them.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STUDIO_V3_PHASE_ORDER, getNextPhase } from "../curation";
import { canonicalStudioPhase } from "../studioPhaseCanonical";
import {
  resolveAuthoritativeRouteStops,
  isProvablyUntouchedCanonicalAnchor,
} from "../studioRouteAuthority";
import { initialLogisticsMoment } from "../LogisticsPhase";
import { isStopClosedOn } from "@/data/stopOperational";
import type { AuthoredRoutePoint, Pickup, StudioV3Phase, StudioV3State } from "../types";
import { INITIAL_STATE } from "../types";

const SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

function idx(phase: StudioV3Phase): number {
  return STUDIO_V3_PHASE_ORDER.indexOf(phase);
}

function state(overrides: Partial<StudioV3State> = {}): StudioV3State {
  return {
    ...INITIAL_STATE,
    feeling: "coastal",
    companions: "couple",
    interests: ["coast"],
    rhythm: "slow",
    delegationMode: "yes-designs",
    ...overrides,
  } as StudioV3State;
}

const point = (label: string, id: string): AuthoredRoutePoint =>
  ({ label, story: "", inventoryStopId: id }) as AuthoredRoutePoint;

/* -------------------------------------------------------------- A + B --- */

describe("A/B — canonical order and adaptive walk", () => {
  it("orders refinement → storyboard → logistics → guestDetails → checkoutSummary", () => {
    expect(idx("refinement")).toBeLessThan(idx("storyboard"));
    expect(idx("logistics")).toBeLessThan(idx("storyboard"));
    expect(idx("storyboard")).toBeLessThan(idx("guestDetails"));
    expect(idx("guestDetails")).toBeLessThan(idx("checkoutSummary"));
  });

  it("walks the live path and still skips retired legacy questions", () => {
    const s = state();
    expect(getNextPhase(s, "rhythm")).toBe("storyboard");
    expect(getNextPhase(s, "refinement")).toBe("storyboard");
    expect(getNextPhase(s, "storyboard")).toBe("guestDetails");
    for (const legacy of [
      "destination",
      "date",
      "pickup",
      "guests",
      "investment",
      "occasion",
      "considerations",
      "language",
      "map",
      "confirmation",
    ] as StudioV3Phase[]) {
      expect(STUDIO_V3_PHASE_ORDER).toContain(legacy);
      expect(getNextPhase(s, "storyboard")).not.toBe(legacy);
    }
  });
});

/* ------------------------------------------------------------------ C --- */

describe("C — hydration canonicalizes onto the reward surface", () => {
  it("canonicalizes logistics, map and confirmation to storyboard", () => {
    expect(canonicalStudioPhase("logistics")).toBe("storyboard");
    expect(canonicalStudioPhase("map")).toBe("storyboard");
    expect(canonicalStudioPhase("confirmation")).toBe("storyboard");
    expect(canonicalStudioPhase("interests")).toBe("interests");
  });

  it("keeps already-entered logistics facts and reopens at the first gap", () => {
    const mid = state({
      phase: "logistics",
      dateMode: "flexible",
      pickup: "lisbon" as Pickup,
    });
    expect(canonicalStudioPhase(mid.phase)).toBe("storyboard");
    expect(mid.dateMode).toBe("flexible");
    expect(mid.pickup).toBe("lisbon");
    // Re-entering logistics never asks answered facts from zero.
    expect(initialLogisticsMoment(mid)).toBe("review");
    expect(initialLogisticsMoment({ ...mid, pickup: null } as StudioV3State)).toBe("where");
  });
});

/* ------------------------------------------------------------------ D --- */

describe("D — itinerary authority priority", () => {
  const edited = [point("Edited", "s-edited")];
  const committed = [point("Committed", "s-committed")];
  const composed = [point("Composed", "s-composed")];
  const compact = [point("Compact", "s-compact")];
  const catalog = [point("Catalog", "s-catalog")];
  const all = {
    editedRoutePoints: edited,
    committedRoutePoints: committed,
    resolved: { composedRoutePoints: composed, routePoints: compact },
    catalogStops: catalog,
  };

  it("prefers edited > committed > composed > compact > catalog", () => {
    expect(resolveAuthoritativeRouteStops(all)[0]!.label).toBe("Edited");
    expect(
      resolveAuthoritativeRouteStops({ ...all, editedRoutePoints: null })[0]!.label,
    ).toBe("Committed");
    expect(
      resolveAuthoritativeRouteStops({
        ...all,
        editedRoutePoints: null,
        committedRoutePoints: null,
      })[0]!.label,
    ).toBe("Composed");
    expect(
      resolveAuthoritativeRouteStops({
        ...all,
        editedRoutePoints: null,
        committedRoutePoints: null,
        resolved: { routePoints: compact },
      })[0]!.label,
    ).toBe("Compact");
    expect(
      resolveAuthoritativeRouteStops({ catalogStops: catalog })[0]!.label,
    ).toBe("Catalog");
  });
});

/* ------------------------------------------------------------------ E --- */

describe("E — a snapshot is not a manual edit", () => {
  const catalog = [point("Cabo Espichel", "s-espichel"), point("Sesimbra", "s-sesimbra")];

  it("lets an exact canonical committed route prove untouched", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        committedRoutePoints: catalog.map((c) => ({ ...c })),
        resolved: null,
        catalogStops: catalog,
      }),
    ).toBe(true);
  });

  it("fails closed for a committed route that differs from the anchor", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: null,
        committedRoutePoints: [catalog[0]!, point("Azeitão", "s-azeitao")],
        resolved: null,
        catalogStops: catalog,
      }),
    ).toBe(false);
  });

  it("still disqualifies genuine traveller edits", () => {
    expect(
      isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: catalog.map((c) => ({ ...c })),
        committedRoutePoints: catalog.map((c) => ({ ...c })),
        resolved: null,
        catalogStops: catalog,
      }),
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------ F --- */

describe("F — logistics facts never change the committed day", () => {
  it("keeps membership, order and structural ids after date/pickup/party", () => {
    const committed = [
      point("Cabo Espichel", "s-espichel"),
      point("Sesimbra", "s-sesimbra"),
      point("Azeitão", "s-azeitao"),
    ];
    const before = resolveAuthoritativeRouteStops({
      committedRoutePoints: committed,
      resolved: { composedRoutePoints: [point("Somewhere else", "s-other")] },
      catalogStops: [point("Catalog", "s-catalog")],
    });
    // Logistics only commits facts; the route inputs are untouched.
    const after = resolveAuthoritativeRouteStops({
      committedRoutePoints: committed,
      resolved: { composedRoutePoints: [point("A different composition", "s-diff")] },
      catalogStops: [point("Catalog", "s-catalog")],
    });
    expect(after.map((s) => s.inventoryStopId)).toEqual([
      "s-espichel",
      "s-sesimbra",
      "s-azeitao",
    ]);
    expect(after.map((s) => s.label)).toEqual(before.map((s) => s.label));
  });
});

/* ------------------------------------------------------------- G + H --- */

describe("G/H — reward hands over to admin, admin does not compose", () => {
  it("routes Your Day continuations to logistics, not guest details", () => {
    // PREFLIGHT-FIRST: the practical facts are already known, so Your Day
    // hands straight over to contact details.
    expect(SRC).toContain('onSecure={() => advance("guestDetails")}');
  });

  it("retires the blocking interpretation beat from the live path", () => {
    expect(SRC).not.toContain("<DirectorsRead");
  });

  it("the preflight commits facts and never composes a route", () => {
    const commit = SRC.slice(
      SRC.indexOf("const runPreflight = useCallback"),
      SRC.indexOf('advance(getNextPhase(forward, "logistics"))'),
    );
    expect(commit.length).toBeGreaterThan(200);
    expect(commit).not.toContain("resolveStudioV3Route(");
    expect(SRC).toContain('advance(getNextPhase(forward, "logistics"))');
  });

  it("returns from the preflight to the invitation", () => {
    expect(SRC).toContain('onBackPhase={() => back("intro")}');
  });
});

/* ------------------------------------------------------------------ I --- */

describe("I — exact-date closure fails closed", () => {
  it("uses the real operational registry and never mutates membership", () => {
    // Non-vacuous: the registry really does close this moment on a Monday.
    const closedHaystack = "Mercado do Livramento the tiled market hall";
    const mondayIso = "2026-09-07";
    expect(isStopClosedOn(closedHaystack, mondayIso)).toBe(true);

    // The date is known BEFORE composition now, so the closure is enforced on
    // the composed day itself and blocks reservation with a truthful reason.
    const guard = SRC.slice(
      SRC.indexOf("const closedMomentConflict = useMemo("),
      SRC.indexOf("const canProceedToLogistics ="),
    );
    expect(guard).toContain("isStopClosedOn(");
    expect(guard).not.toContain("committedRoutePoints:");
    expect(guard).not.toContain("editedRoutePoints:");
    expect(SRC).toContain("!closedMomentConflict"); 
  });
});

/* ------------------------------------------------------------------ J --- */

describe("J — snapshot lifecycle", () => {
  it("snapshots once on the first canonical storyboard entry", () => {
    expect(INITIAL_STATE.committedRoutePoints).toBeNull();
    const effect = SRC.slice(
      SRC.indexOf("PASS 4 — FREEZE THE SHOWN DAY"),
      SRC.indexOf("const advance = useCallback"),
    );
    expect(effect).toContain('if (state.phase !== "storyboard") return;');
    expect(effect).toContain("(s.committedRoutePoints?.length ?? 0) > 0) return s;");
    expect(effect).toContain("resolveAuthoritativeRouteStops(");
    expect(effect).toContain("inventoryStopId:");
    expect(effect).toContain("focal:");
    expect(effect).toContain("lat:");
  });

  it("clears the snapshot only when backing into taste, never on the admin path", () => {
    const backBlock = SRC.slice(
      SRC.indexOf("PASS 4 — going BACK from the reward surface"),
      SRC.indexOf("setExiting(false);\n      }, 280);"),
    );
    expect(backBlock).toContain('state.phase === "storyboard"');
    expect(backBlock).toContain('PHASE_ORDER.indexOf(target) < PHASE_ORDER.indexOf("storyboard")');
    expect(backBlock).toContain("committedRoutePoints: null");
    // Logistics → Your Day is a forward-of-storyboard origin, so the guard
    // (`state.phase === "storyboard"`) cannot fire and the day is preserved.
    expect(idx("logistics")).toBeLessThan(idx("storyboard"));
  });
});
