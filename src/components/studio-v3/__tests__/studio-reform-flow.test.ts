import { describe, expect, it } from "vitest";
import { STUDIO_V3_PHASE_ORDER, getNextPhase, isPhaseRelevant } from "../curation";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { decideFeeling, decideInterests, decideRhythm } from "../letYesDecide";

const base: StudioV3State = { ...INITIAL_STATE, phase: "feeling" };

describe("Studio reform — phase model", () => {
  it("orders the flow desire-first, logistics last", () => {
    const asked = STUDIO_V3_PHASE_ORDER.filter((p) => isPhaseRelevant(p, base));
    expect(asked.slice(0, 5)).toEqual(["intro", "feeling", "who", "interests", "rhythm"]);
    expect(asked).toContain("logistics");
    // PASS 4: REWARD BEFORE ADMIN — the composed day is revealed first, and
    // logistics ("Make it real") is the admin beat that follows it.
    expect(asked.indexOf("storyboard")).toBeLessThan(asked.indexOf("logistics"));
    expect(asked).not.toContain("map");
    expect(asked).not.toContain("confirmation");
  });

  it("never asks destination, date, pickup, guests, investment as standalone phases", () => {
    for (const phase of [
      "destination",
      "date",
      "pickup",
      "guests",
      "investment",
      "occasion",
      "considerations",
      "language",
    ] as const) {
      expect(isPhaseRelevant(phase, base)).toBe(false);
    }
  });

  it("walks rhythm → the unified storyboard surface → logistics", () => {
    const s: StudioV3State = { ...base, feeling: "coastal", companions: "couple", refinement: "coast-wild-beaches" };
    expect(getNextPhase(s, "rhythm")).toBe("storyboard");
    expect(getNextPhase(s, "storyboard")).toBe("logistics");
    expect(getNextPhase(s, "logistics")).toBe("guestDetails");
  });
});

describe("Let YES decide", () => {
  it("is deterministic and taxonomy-bound", () => {
    const s: StudioV3State = { ...base, interests: ["wine"], companions: "couple" };
    expect(decideFeeling(s)).toBe(decideFeeling(s));
    expect(decideFeeling(s)).toBe("wine-food");
    const interests = decideInterests({ ...s, feeling: "coastal" });
    expect(interests.length).toBeGreaterThan(0);
    expect(interests.length).toBeLessThanOrEqual(4);
    expect(new Set(interests).size).toBe(interests.length);
  });

  it("falls back to neutral operational defaults with no signal", () => {
    expect(decideFeeling(base)).toBe("coastal");
    expect(decideRhythm(base)).toBe("balanced");
    expect(decideInterests(base)).toEqual(["coast", "gastronomy"]);
  });
});
