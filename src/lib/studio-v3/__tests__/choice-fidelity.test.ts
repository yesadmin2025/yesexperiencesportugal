/**
 * CHOICE FIDELITY — the day must contain the moment the traveller chose, and
 * must not contain the moment they declined in the same question.
 *
 * Locks two real reported defects:
 *  1. "the coast seen from the water" produced a wine day with no boat, because
 *     a later, broader direction answer silently outranked it.
 *  2. a day where cheese was chosen over tile still ended with a tile workshop.
 */
import { describe, expect, it } from "vitest";

import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { exactDirectorObligations } from "@/lib/studio-v3/exactDirectorObligations";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";

function answer(
  questionKey: string,
  offeredOptionIds: string[],
  selectedOptionIds: string[],
): QuestionAnswerEvent {
  return {
    questionKey,
    uncertaintyKey: questionKey.replace("question:", "fork:"),
    targetKeys: [],
    offeredOptionIds,
    selectedOptionIds,
    semanticEffects: [],
    dependencyFingerprint: questionKey,
    source: "director",
  };
}

const COAST_FROM_WATER = answer(
  "question:arrabida-coast-day",
  ["coast-from-the-water", "coast-wild-beaches"],
  ["coast-from-the-water"],
);
const WINE_DEPTH = answer(
  "question:wine-day-depth",
  ["wine-cellar-depth", "wine-monumental-estates"],
  ["wine-cellar-depth"],
);
const CHEESE_OVER_TILE = answer(
  "question:hands-on-craft",
  ["hands-paint-tile", "hands-make-cheese"],
  ["hands-make-cheese"],
);

describe("choice fidelity — exact director obligations", () => {
  it("keeps every obligation stop real inventory", () => {
    const ids = new Set(REGION_STOP_POOL.map((stop) => stop.id));
    for (const history of [[COAST_FROM_WATER], [CHEESE_OVER_TILE]]) {
      const { principalStopIds, rejectedStopIds } = exactDirectorObligations(history);
      for (const stopId of [...principalStopIds, ...rejectedStopIds]) {
        expect(ids.has(stopId)).toBe(true);
      }
    }
  });

  it("turns 'the coast seen from the water' into the real boat moment", () => {
    const obligations = exactDirectorObligations([COAST_FROM_WATER]);
    expect(obligations.principalStopIds).toContain("arrabida-bay-boat");
    expect(obligations.preferredSignatureId).toBe("arrabida-boat");
  });

  it("does not let a later broader wine answer discard the chosen water moment", () => {
    const obligations = exactDirectorObligations([COAST_FROM_WATER, WINE_DEPTH]);
    expect(obligations.principalStopIds).toContain("arrabida-bay-boat");
    expect(obligations.preferredSignatureId).toBe("arrabida-boat");
  });

  it("holds the chosen cheese workshop and drops the declined tile workshop", () => {
    const obligations = exactDirectorObligations([CHEESE_OVER_TILE]);
    expect(obligations.principalStopIds).toContain("quinta-velha-cheese-workshop");
    expect(obligations.rejectedStopIds).toContain("azulejos-painting-workshop");
    expect(obligations.preferredSignatureId).toBe("azeitao-cheese");
  });

  it("never rejects a moment that was also chosen elsewhere", () => {
    const tileChosenLater = answer(
      "question:heritage-lens",
      ["hands-paint-tile", "photo-landmarks"],
      ["hands-paint-tile"],
    );
    const obligations = exactDirectorObligations([CHEESE_OVER_TILE, tileChosenLater]);
    expect(obligations.principalStopIds).toContain("azulejos-painting-workshop");
    expect(obligations.rejectedStopIds).not.toContain("azulejos-painting-workshop");
  });

  it("names the cheese workshop as the cheese experience", () => {
    const stop = REGION_STOP_POOL.find((item) => item.id === "quinta-velha-cheese-workshop");
    expect(stop?.name.toLowerCase()).toContain("cheese");
  });
});
