// Regression: the Studio V3 storyboard "Refine your Signature" editor must
// NEVER render the dead-end empty state while a real skeleton Signature is
// resolved and its own `stops` pool is non-empty. Two paths must be safe:
//
//  1. `resolved.routePoints` is empty (curation returned zero moments after
//     coherence + closure filters) → seed from the skeleton's own pool.
//  2. `state.editedRoutePoints` is a persisted-but-empty `[]` (stale draft
//     or hydration bug) → the memoised `editedStops` falls back to
//     `baseStops` instead of stranding the guest on the empty copy.
//
// These are pure-logic assertions against the same helpers the memo uses,
// mirroring the exact branch shape in `StudioV3.tsx`.

import { describe, it, expect } from "vitest";
import {
  filterStopsBySuitability,
  validateItineraryAfterReplacement,
} from "@/components/studio-v3/stop-suitability";
import { requirementsFromComposition } from "@/lib/pricing/travellerSuitability";

type Stop = { label: string; story?: string };

function baseStopsRecovery(
  rawStops: readonly Stop[],
  pool: readonly Stop[],
  requirements = requirementsFromComposition(
    { adults: 2, minorAges: [] },
    { requiresChildSeat: false, requiresStroller: false },
  ),
): Stop[] {
  const outcome = filterStopsBySuitability(rawStops, requirements, pool);
  const validity = validateItineraryAfterReplacement(outcome, requirements);
  const seedFromPool = () =>
    pool.length > 0 ? pool.slice(0, Math.min(3, pool.length)) : [];
  if (validity !== null) {
    if (outcome.stops.length > 0) return outcome.stops;
    return seedFromPool();
  }
  return outcome.stops.length > 0 ? outcome.stops : seedFromPool();
}

const POOL: Stop[] = [
  { label: "Belém Riverside", story: "" },
  { label: "Cabo da Roca", story: "" },
  { label: "Sesimbra Village", story: "" },
  { label: "Arrábida Viewpoint", story: "" },
];

describe("baseStops recovery — Studio V3 storyboard", () => {
  it("seeds up to 3 stops from the skeleton pool when raw routePoints is empty", () => {
    const result = baseStopsRecovery([], POOL);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
    // Every seeded stop MUST come from the same skeleton pool.
    for (const s of result) {
      expect(POOL.map((p) => p.label)).toContain(s.label);
    }
  });

  it("returns [] only when both raw and pool are empty (last-resort dead end)", () => {
    expect(baseStopsRecovery([], [])).toEqual([]);
  });

  it("prefers real raw stops over the pool seed when raw has content", () => {
    const raw: Stop[] = [{ label: "Belém Riverside", story: "" }];
    const result = baseStopsRecovery(raw, POOL);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Belém Riverside");
  });

  it("editedStops override treats a persisted empty [] as 'no override'", () => {
    // Mirrors the memoised expression in StudioV3.tsx:
    //   editedStops = (editedRoutePoints && editedRoutePoints.length > 0)
    //                   ? editedRoutePoints : baseStops
    const baseStops: Stop[] = [{ label: "Cabo da Roca", story: "" }];
    const persistedEmpty: Stop[] = [];
    const editedStops =
      persistedEmpty && persistedEmpty.length > 0 ? persistedEmpty : baseStops;
    expect(editedStops).toEqual(baseStops);
  });
});
