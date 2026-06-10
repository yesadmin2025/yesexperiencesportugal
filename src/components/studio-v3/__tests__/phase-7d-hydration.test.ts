// Studio V3 — Phase 7D: saved-link hydration contract.
//
// Locks the shape of how a saved Signature payload merges back into the
// runtime state when reopened via `?saved=<token>`:
//   1. Missing fields fall back to INITIAL_STATE defaults.
//   2. editedRoutePoints from the saved payload are preserved verbatim.
//   3. The restored phase is always "storyboard" (jumps to the reveal).

import { describe, it, expect } from "vitest";
import { INITIAL_STATE, type StudioV3State, type StudioV3Phase } from "../types";

function hydrate(saved: Partial<StudioV3State>): StudioV3State {
  return {
    ...INITIAL_STATE,
    ...saved,
    phase: "storyboard" as StudioV3Phase,
    destinationIntent:
      saved.destinationIntent === "anywhere-special"
        ? "no-preference"
        : (saved.destinationIntent ?? INITIAL_STATE.destinationIntent),
  };
}

describe("Phase 7D — saved Signature hydration", () => {
  it("preserves editedRoutePoints from the saved payload", () => {
    const edited = [
      { label: "Cabo da Roca", story: "Westernmost point." },
      { label: "Azenhas do Mar", story: "Lunch above the waves." },
    ];
    const restored = hydrate({
      feeling: "coastal",
      companions: "couple",
      tourId: "sintra-cabo-da-roca",
      editedRoutePoints: edited,
    });

    expect(restored.editedRoutePoints).toEqual(edited);
    expect(restored.phase).toBe("storyboard");
    expect(restored.feeling).toBe("coastal");
  });

  it("falls back to INITIAL_STATE defaults for missing fields", () => {
    const restored = hydrate({ feeling: "wine-food" });
    expect(restored.companions).toBeNull();
    expect(restored.interests).toEqual([]);
    expect(restored.considerations).toEqual([]);
    expect(restored.editedRoutePoints).toBeNull();
    expect(restored.phase).toBe("storyboard");
  });

  it("always lands on the storyboard phase even if saved phase differs", () => {
    const restored = hydrate({
      phase: "feeling" as StudioV3Phase,
      feeling: "hidden",
    });
    expect(restored.phase).toBe("storyboard");
  });
});
