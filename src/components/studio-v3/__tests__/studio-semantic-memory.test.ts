import { describe, expect, it } from "vitest";
import {
  deriveSemanticMemory,
  understoodSignals,
  understoodSummary,
} from "@/components/studio-v3/studioSemanticMemory";
import { resolveAdaptiveQuestion } from "@/components/studio-v3/adaptiveQuestions";
import { INITIAL_STATE, type StudioV3State } from "@/components/studio-v3/types";

function stateWith(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

describe("semantic memory", () => {
  it("knows hands-on only from explicit hands-on intent", () => {
    expect(deriveSemanticMemory(stateWith({ feeling: "hands-on" })).has("activity.hands-on")).toBe(
      true,
    );
    expect(
      deriveSemanticMemory(stateWith({ interests: ["hands-on"] })).has("activity.hands-on"),
    ).toBe(true);
    for (const patch of [
      { feeling: "culture" as const },
      { feeling: "hidden" as const },
      { interests: ["heritage" as const] },
      { interests: ["local-life" as const] },
    ]) {
      expect(deriveSemanticMemory(stateWith(patch)).has("activity.hands-on")).toBe(false);
    }
  });

  it("knows wine only from explicit wine intent", () => {
    expect(deriveSemanticMemory(stateWith({ feeling: "wine-food" })).has("theme.wine")).toBe(true);
    for (const patch of [
      { interests: ["gastronomy" as const] },
      { feeling: "romance" as const },
      { feeling: "slow-luxury" as const },
    ]) {
      expect(deriveSemanticMemory(stateWith(patch)).has("theme.wine")).toBe(false);
    }
  });

  it("knows faith only from explicit faith feeling or interest", () => {
    expect(deriveSemanticMemory(stateWith({ feeling: "faith" })).has("theme.faith")).toBe(true);
    expect(deriveSemanticMemory(stateWith({ interests: ["faith"] })).has("theme.faith")).toBe(true);
    expect(deriveSemanticMemory(stateWith({ interests: ["heritage"] })).has("theme.faith")).toBe(
      false,
    );
  });
});

describe("understood summary", () => {
  it("returns nothing when there is nothing useful to acknowledge", () => {
    expect(understoodSummary(INITIAL_STATE)).toBeNull();
  });

  it("keeps at most three positive signals and no supplier, stop or price text", () => {
    const summary = understoodSummary(
      stateWith({
        feeling: "coastal",
        interests: ["coast", "local-life", "photography", "wine"],
        rhythm: "slow",
      }),
    );
    expect(summary).not.toBeNull();
    expect(summary!.signals.length).toBeLessThanOrEqual(3);
    expect(summary!.lead).toBe("I've got it.");
    expect(summary!.detail).not.toMatch(/€|\$|no wine|winery|azeit|arráb|arrab|sanctuar/i);
  });

  it("never mentions unselected negatives", () => {
    const signals = understoodSignals(stateWith({ feeling: "coastal", rhythm: "slow" }));
    expect(signals).toEqual(["Coast first", "slow rhythm"]);
  });
});

describe("adaptive question semantic eligibility", () => {
  it("asks which craft when hands-on is explicit", () => {
    for (const patch of [
      { feeling: "hands-on" as const },
      { feeling: "culture" as const, interests: ["hands-on" as const] },
    ]) {
      const question = resolveAdaptiveQuestion(
        stateWith({ ...patch, destinationIntent: "arrabida-setubal-azeitao" }),
      );
      expect(question?.kind).toBe("hands");
      expect(`${question?.title} ${question?.titleAccent}`).toMatch(/which craft/i);
    }
  });

  it("never offers a workshop from culture, heritage, local life or hidden Portugal", () => {
    for (const patch of [
      { feeling: "culture" as const, interests: ["heritage" as const] },
      { feeling: "hidden" as const, interests: ["local-life" as const] },
      { feeling: "culture" as const, interests: ["local-life" as const] },
    ]) {
      const question = resolveAdaptiveQuestion(
        stateWith({ ...patch, destinationIntent: "arrabida-setubal-azeitao" }),
      );
      expect(question?.kind).not.toBe("hands");
    }
  });

  it("asks the direction of faith, never whether faith is wanted", () => {
    const question = resolveAdaptiveQuestion(
      stateWith({ feeling: "faith", destinationIntent: "spiritual-coast" }),
    );
    expect(question?.kind).toBe("faith");
    expect(question?.titleAccent).toMatch(/which thread/i);
    expect(`${question?.title} ${question?.titleAccent}`).not.toMatch(/would you like|do you want/i);
    expect(question?.options.map((o) => o.id)).toContain("faith-quiet-reflection");
  });

  it("asks at most one directional faith question when feeling and interest agree", () => {
    const state = stateWith({
      feeling: "faith",
      interests: ["faith"],
      destinationIntent: "spiritual-coast",
    });
    const question = resolveAdaptiveQuestion(state);
    expect(question?.kind).toBe("faith");
    expect(question?.options.filter((o) => o.id.startsWith("faith-")).length).toBe(3);
  });

  it("never produces a wine question from gastronomy, romance or slow luxury", () => {
    for (const patch of [
      { interests: ["gastronomy" as const] },
      { feeling: "romance" as const },
      { feeling: "slow-luxury" as const },
    ]) {
      const question = resolveAdaptiveQuestion(
        stateWith({ ...patch, destinationIntent: "arrabida-setubal-azeitao" }),
      );
      expect(question?.kind).not.toBe("wine");
    }
  });

  it("cannot be forced by an AI preferred kind when eligibility says no", () => {
    const state = stateWith({
      feeling: "culture",
      interests: ["heritage"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    for (const forced of ["hands", "wine", "faith"] as const) {
      expect(resolveAdaptiveQuestion(state, forced)?.kind).not.toBe(forced);
    }
  });
});
