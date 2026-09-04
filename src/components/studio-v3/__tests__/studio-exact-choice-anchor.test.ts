import { describe, expect, it } from "vitest";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";

/**
 * A concrete Director choice is a promise. The composed day must contain the
 * exact moment the traveller picked — never the sibling option.
 */
const handsOnEvent = (selected: string): QuestionAnswerEvent => ({
  questionKey: "hands-on-path",
  uncertaintyKey: "hands-on-traditions",
  targetKeys: ["hands-on-traditions"],
  offeredOptionIds: ["hands-paint-tile", "hands-make-cheese"],
  selectedOptionIds: [selected],
  semanticEffects: [],
  dependencyFingerprint: "fp",
  source: "director",
});

const resolve = (selected: string) =>
  resolveStudioV3Route({
    feeling: "curious" as never,
    companions: "couple" as never,
    rhythm: "balanced" as never,
    interests: ["gastronomy", "local-life"] as never,
    pickup: "lisbon" as never,
    questionHistory: [handsOnEvent(selected)],
    dateExact: "2026-10-15",
  });

describe("exact Director choice anchors the day", () => {
  it("cheese-making resolves the cheese Signature, never the tile day", () => {
    const route = resolve("hands-make-cheese");
    expect(route.skeletonTourKey).toBe("azeitao-cheese");
    const labels = route.composedRoutePoints.map((p) => p.label.toLowerCase()).join(" | ");
    expect(labels).not.toContain("tile");
  });

  it("tile painting resolves the tile Signature, never the cheese day", () => {
    const route = resolve("hands-paint-tile");
    expect(route.skeletonTourKey).toBe("tiles-workshop");
    const labels = route.composedRoutePoints.map((p) => p.label.toLowerCase()).join(" | ");
    expect(labels).toContain("tile");
  });
});
