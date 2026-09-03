import { describe, expect, it } from "vitest";

import { resolveHighSignalConflict } from "@/components/studio-v3/highSignalConflict";
import { INITIAL_STATE } from "@/components/studio-v3/types";
import { exactDirectorObligations } from "@/lib/studio-v3/exactDirectorObligations";
import { appendLiveDirectorAnswer } from "@/lib/studio-v3/studioQuestionHistoryBridge";

function workshopAnswer(selectedOptionId: "hands-make-cheese" | "hands-paint-tile") {
  return appendLiveDirectorAnswer([], {
    questionKey: "question:hands-on-craft",
    uncertaintyKey: "fork:hands-on-craft",
    dependencyFingerprint: "faith-and-workshop",
    offeredOptionIds: ["hands-paint-tile", "hands-make-cheese"],
    selectedOptionId,
  });
}

describe("exact Director obligations", () => {
  it("turns cheese into the real cheese workshop, never the tile workshop", () => {
    const obligations = exactDirectorObligations(workshopAnswer("hands-make-cheese"));
    expect(obligations.preferredSignatureId).toBe("azeitao-cheese");
    expect(obligations.principalStopIds).toEqual(["quinta-velha-cheese-workshop"]);
    expect(obligations.principalStopIds).not.toContain("azulejos-painting-workshop");
  });

  it("turns tile painting into the real tile workshop", () => {
    expect(exactDirectorObligations(workshopAnswer("hands-paint-tile"))).toEqual({
      preferredSignatureId: "tiles-workshop",
      principalStopIds: ["azulejos-painting-workshop"],
    });
  });

  it("keeps the anchor on the Signature that owns the exact moment when a later, broader answer follows", () => {
    // Live regression: choosing "make cheese" and THEN a wine-depth answer used
    // to move the anchor to the wine Signature, whose pool has no cheese
    // workshop — the composition became impossible and the choice was dropped.
    const history = appendLiveDirectorAnswer(workshopAnswer("hands-make-cheese"), {
      questionKey: "question:wine-focus",
      uncertaintyKey: "fork:wine-focus",
      dependencyFingerprint: "wine-focus",
      offeredOptionIds: ["wine-cellar-depth", "wine-monumental-estates"],
      selectedOptionId: "wine-cellar-depth",
    });
    const obligations = exactDirectorObligations(history);
    expect(obligations.preferredSignatureId).toBe("azeitao-cheese");
    expect(obligations.principalStopIds).toEqual(["quinta-velha-cheese-workshop"]);
  });


  it("stops Faith plus an incompatible cheese answer before Your Day", () => {
    const conflict = resolveHighSignalConflict({
      ...INITIAL_STATE,
      feeling: "faith",
      companions: "couple",
      rhythm: "balanced",
      pickup: "lisbon",
      adults: 2,
      guests: 2,
      interests: ["faith", "hands-on"],
      questionHistory: workshopAnswer("hands-make-cheese"),
    });
    expect(conflict?.message).toMatch(/sacred heritage.*hands-on workshops/i);
    expect(conflict?.message).toMatch(/instantly bookable/i);
  });
});