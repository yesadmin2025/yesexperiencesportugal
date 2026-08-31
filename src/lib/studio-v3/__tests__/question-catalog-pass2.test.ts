import { describe, expect, it } from "vitest";

// TEST-ONLY import of the live module, purely to catch mirror drift.
import { REFINEMENT_TO_SIGNAL } from "@/components/studio-v3/adaptiveQuestions";
import type { AdaptiveRefinementId } from "@/components/studio-v3/types";
import {
  DIRECTOR_OPTION_CATALOG,
  DIRECTOR_OPTION_IDS,
  LEGACY_REFINEMENT_SIGNAL_MIRROR,
  TIMING_ACTION_OPTION_ID,
  TRADEOFF_OPTION_IDS,
  discoveryChoice,
  discoverySignalForOption,
  timingChoice,
  isDirectorOptionId,
} from "@/lib/studio-v3/questionOptionCatalog";

describe("Pass 2 — N. catalogue parity with the live refinement mapping", () => {
  it("maps every legacy AdaptiveRefinementId to the same discovery signal", () => {
    const legacyIds = Object.keys(REFINEMENT_TO_SIGNAL) as AdaptiveRefinementId[];
    expect(legacyIds.length).toBeGreaterThan(0);
    expect(Object.keys(LEGACY_REFINEMENT_SIGNAL_MIRROR).sort()).toEqual([...legacyIds].sort());
    for (const id of legacyIds) {
      expect(LEGACY_REFINEMENT_SIGNAL_MIRROR[id]).toBe(REFINEMENT_TO_SIGNAL[id]);
      expect(discoverySignalForOption(id)).toBe(REFINEMENT_TO_SIGNAL[id]);
    }
  });

  it("contains the required real director forks", () => {
    expect(DIRECTOR_OPTION_CATALOG["faith-sanctuary-time"].discoverySignal).toBe(
      "living-faith-and-coast",
    );
    expect(DIRECTOR_OPTION_CATALOG["faith-templar-heritage"].discoverySignal).toBe(
      "templars-and-university",
    );
    expect(DIRECTOR_OPTION_CATALOG["wine-monumental-estates"].discoverySignal).toBe(
      "monumental-alentejo",
    );
    expect(DIRECTOR_OPTION_CATALOG["wine-clay-talha"].discoverySignal).toBe("roman-talha-family");
    expect(DIRECTOR_OPTION_CATALOG["coast-from-the-water"].discoverySignal).toBe(
      "arrabida-from-water",
    );
    expect(DIRECTOR_OPTION_CATALOG["coast-remote-southwest"].discoverySignal).toBe(
      "wild-vicentine-coast",
    );
    expect(DIRECTOR_OPTION_CATALOG["hands-paint-tile"].discoverySignal).toBe("paint-azulejo");
    expect(DIRECTOR_OPTION_CATALOG["hands-make-cheese"].discoverySignal).toBe(
      "make-azeitao-cheese",
    );
  });

  it("adds only non-discovery tradeoff ids beyond the legacy set", () => {
    const extra = DIRECTOR_OPTION_IDS.filter(
      (id) => !(id in LEGACY_REFINEMENT_SIGNAL_MIRROR),
    ).sort();
    expect(extra).toEqual([...TRADEOFF_OPTION_IDS].sort());
    for (const id of TRADEOFF_OPTION_IDS) {
      expect(DIRECTOR_OPTION_CATALOG[id].kind).toBe("tradeoff");
      expect(DIRECTOR_OPTION_CATALOG[id].discoverySignal).toBeNull();
    }
  });

  it("mirrors the real BUILD-1 timing action kinds and retires the generic one", () => {
    expect([...TRADEOFF_OPTION_IDS].sort()).toEqual([
      "time-choose-between-anchors",
      "time-extend-duration",
      "time-swap-moment",
    ]);
    expect(isDirectorOptionId("time-choose-priorities")).toBe(false);
    expect(TIMING_ACTION_OPTION_ID["swap-moment"]).toBe("time-swap-moment");
    const a = timingChoice({
      option: "swap-moment",
      dropStopId: "stop-a",
      forStopId: "stop-c",
      minutesRecovered: 80,
      dimensionCost: null,
    });
    const b = timingChoice({
      option: "swap-moment",
      dropStopId: "stop-b",
      forStopId: "stop-c",
      minutesRecovered: 80,
      dimensionCost: null,
    });
    expect(a.id).toBe(b.id);
    expect(a.choiceKey).not.toBe(b.choiceKey);
    expect(discoveryChoice("hands-paint-tile").choiceKey).toBe("hands-paint-tile");
  });

  it("fails closed on unknown option ids", () => {
    expect(isDirectorOptionId("invented-option")).toBe(false);
    expect(discoverySignalForOption("invented-option")).toBeNull();
  });
});
