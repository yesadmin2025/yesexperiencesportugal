/**
 * Phase B — reveal composer stops.
 *
 * Proves the composer adapter produces materially distinct stop lists
 * for contrasting traveller profiles when the flag is on. Full reveal
 * rendering is covered by e2e tests; this suite validates the wiring
 * point (adapter → composer → composedStops) end-to-end without React.
 */

import { describe, it, expect } from "vitest";
import { composeFromState, adaptStateToComposeInput } from "@/lib/studio-v3/composerAdapter";
import type { StudioV3State } from "@/components/studio-v3/types";

function makeState(over: Partial<StudioV3State>): StudioV3State {
  return {
    // Only the fields the adapter reads matter; cast is safe for this test.
    feeling: null,
    companions: null,
    rhythm: null,
    interests: [],
    pickup: null,
    occasion: null,
    considerations: [],
    investment: null,
    destinationIntent: null,
    tourId: null,
    adults: null,
    minorAges: [],
    guests: null,
    editedRoutePoints: null,
    journeyTitle: null,
    ...over,
  } as unknown as StudioV3State;
}

// Fixed reference date (Wed, Jul 15 2026) so weekday/season filters are stable.
const NOW = new Date("2026-07-15T10:00:00Z");

describe("Phase B — composer adapter", () => {
  it("returns null when required fields are missing", () => {
    expect(adaptStateToComposeInput(makeState({}), NOW)).toBeNull();
  });

  it("maps a Lisbon pickup to the lisbon-coast region", () => {
    const input = adaptStateToComposeInput(
      makeState({ pickup: "lisbon", rhythm: "balanced" }),
      NOW,
    );
    expect(input?.region).toBe("lisbon-coast");
  });

  it("maps sesimbra-setubal-arrabida to arrabida", () => {
    const input = adaptStateToComposeInput(
      makeState({ pickup: "sesimbra-setubal-arrabida", rhythm: "slow" }),
      NOW,
    );
    expect(input?.region).toBe("arrabida");
  });

  it("produces materially distinct stops for contrasting profiles", () => {
    const soloWineSlow = composeFromState(
      makeState({
        pickup: "sesimbra-setubal-arrabida",
        rhythm: "slow",
        companions: "solo",
        interests: ["wine", "gastronomy"],
        investment: "bespoke",
      }),
      NOW,
    );
    const familyCoastFull = composeFromState(
      makeState({
        pickup: "sesimbra-setubal-arrabida",
        rhythm: "full",
        companions: "family",
        interests: ["coast", "nature"],
        investment: "considered",
        minorAges: [6, 9],
      }),
      NOW,
    );

    expect(soloWineSlow).not.toBeNull();
    expect(familyCoastFull).not.toBeNull();

    const idsA = soloWineSlow!.stops.map((s) => s.id).sort();
    const idsB = familyCoastFull!.stops.map((s) => s.id).sort();
    // At least one stop must differ between the two profiles.
    expect(idsA.join(",")).not.toEqual(idsB.join(","));
  });

  it("attaches human-readable rationale to each composed stop", () => {
    const journey = composeFromState(
      makeState({
        pickup: "sesimbra-setubal-arrabida",
        rhythm: "slow",
        companions: "couple",
        interests: ["wine"],
        investment: "elevated",
      }),
      NOW,
    );
    expect(journey).not.toBeNull();
    for (const stop of journey!.stops) {
      expect(typeof stop.rationale).toBe("string");
      expect(stop.rationale.length).toBeGreaterThan(0);
    }
  });
});
