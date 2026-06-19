import { describe, it, expect } from "vitest";
import { computeQualityScore } from "../studio-v3-quality";
import type { StudioV3State } from "@/components/studio-v3/types";

function s(over: Partial<StudioV3State> = {}): StudioV3State {
  return {
    phase: "feeling",
    feeling: null,
    companions: null,
    rhythm: null,
    interests: [],
    pickup: null,
    investment: null,
    occasion: null,
    dateMode: null,
    dateExact: null,
    guests: null,
    guestsInferred: false,
    destinationIntent: null,
    considerations: [],
    firstName: null,
    pathMode: null,
    journeyName: null,
    visited: [],
    ...over,
  } as unknown as StudioV3State;
}

describe("computeQualityScore", () => {
  it("returns null without direction", () => {
    expect(computeQualityScore(s())).toBeNull();
    expect(computeQualityScore(s({ feeling: "wine-food" }))).toBeNull();
  });

  it("scores baseline once feeling + companions exist", () => {
    const r = computeQualityScore(s({ feeling: "wine-food", companions: "couple" }))!;
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.score).toBeLessThan(85);
  });

  it("rewards completed direction (rhythm + 2-3 interests)", () => {
    const r = computeQualityScore(
      s({
        feeling: "wine-food",
        companions: "family",
        rhythm: "slow",
        interests: ["wine", "gastronomy", "heritage"],
        investment: "elevated",
      }),
    )!;
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.tone).toBe("excellent");
  });

  it("penalises overload (5+ themes)", () => {
    const base = computeQualityScore(
      s({
        feeling: "wine-food",
        companions: "couple",
        rhythm: "slow",
        interests: ["wine", "gastronomy", "heritage"],
      }),
    )!;
    const overloaded = computeQualityScore(
      s({
        feeling: "wine-food",
        companions: "couple",
        rhythm: "slow",
        interests: ["wine", "gastronomy", "heritage", "nature", "wellness"],
      }),
    )!;
    expect(overloaded.score).toBeLessThan(base.score);
  });

  it("penalises contradictory pacing (full/immersive + couple-romantic)", () => {
    const calm = computeQualityScore(
      s({ feeling: "wine-food", companions: "couple", rhythm: "balanced" }),
    )!;
    const intense = computeQualityScore(
      s({ feeling: "wine-food", companions: "couple", rhythm: "immersive" }),
    )!;
    expect(intense.score).toBeLessThan(calm.score);
  });
});
