import { describe, expect, it } from "vitest";

import { deriveLivingCanvas, canvasShowsMap } from "@/lib/studio-v3/livingCanvasModel";
import {
  applyRoutedValidation,
  createShapeState,
  commercialIdentities,
  removeMoment,
  swapMoment,
  undoLastEdit,
} from "@/lib/studio-v3/shapeEditing";
import { upsertFreeTextAnswer } from "@/lib/studio-v3/freeTextAnswer";

describe("living canvas — derived, never a second truth", () => {
  it("starts in mood and gains threads from real interests", () => {
    expect(deriveLivingCanvas({ feeling: null, interests: [] }).stage).toBe("mood");
    const withTaste = deriveLivingCanvas({ feeling: "romance", interests: ["wine", "coast"] });
    expect(withTaste.stage).toBe("threads");
    expect(withTaste.threads.filter((t) => t.status !== "excluded").length).toBeGreaterThanOrEqual(2);
    expect(canvasShowsMap(withTaste)).toBe(false);
  });

  it("is deterministic — same input, byte-identical fingerprint", () => {
    const input = { feeling: "romance" as const, interests: ["wine" as const] };
    expect(deriveLivingCanvas(input).fingerprint).toBe(deriveLivingCanvas(input).fingerprint);
  });

  it("an explicit exclusion shows as removed, never as an active thread", () => {
    const history = upsertFreeTextAnswer([], "food but not wine");
    const model = deriveLivingCanvas({ feeling: null, interests: [], questionHistory: history });
    const wine = model.threads.find((t) => t.id === "thread:interest:wine");
    expect(wine?.status).toBe("excluded");
    expect(model.threads.some((t) => t.id === "thread:interest:wine" && t.status === "active")).toBe(
      false,
    );
  });

  it("never draws a route without real coordinates — falls back to a timeline", () => {
    const model = deriveLivingCanvas({
      feeling: null,
      interests: ["wine"],
      composition: {
        regionLabel: "Arrábida",
        points: [
          { label: "Cellar", story: "A cellar.", lat: null, lng: null },
          { label: "Coast", story: "The coast.", lat: null, lng: null },
        ],
      },
    });
    expect(model.stage).toBe("composition");
    expect(model.geography.kind).toBe("timeline");
    expect(canvasShowsMap(model)).toBe(false);
  });

  it("draws a route only from real coordinates", () => {
    const model = deriveLivingCanvas({
      feeling: null,
      interests: ["wine"],
      shaped: true,
      composition: {
        regionLabel: "Arrábida",
        points: [
          { label: "Cellar", story: "A cellar.", lat: 38.5, lng: -9.0 },
          { label: "Coast", story: "The coast.", lat: 38.4, lng: -9.1 },
        ],
      },
    });
    expect(model.stage).toBe("shaped");
    expect(canvasShowsMap(model)).toBe(true);
    expect(model.showsRealMoments).toBe(true);
  });
});

describe("shape — direct manipulation inside truth", () => {
  const base = createShapeState(
    [
      { id: "s1", label: "Cellar", optional: false, commercialId: "TOUR-A::s1" },
      { id: "s2", label: "Village", optional: true, commercialId: "TOUR-A::s2" },
    ],
    { s2: [{ id: "s3", label: "Cove", optional: true, commercialId: "TOUR-A::s3" }] },
  );

  it("refuses to remove a non-optional moment", () => {
    expect(removeMoment(base, "s1").rejected).toBe("not-optional");
    expect(removeMoment(base, "s1").state.moments).toHaveLength(2);
  });

  it("removes an optional moment and undoes it exactly", () => {
    const removed = removeMoment(base, "s2").state;
    expect(removed.moments.map((m) => m.id)).toEqual(["s1"]);
    expect(undoLastEdit(removed).state.moments.map((m) => m.id)).toEqual(["s1", "s2"]);
  });

  it("swaps only for an approved candidate, preserving position and identity", () => {
    expect(swapMoment(base, "s2", "s9").rejected).toBe("candidate-not-approved");
    const swapped = swapMoment(base, "s2", "s3").state;
    expect(swapped.moments.map((m) => m.id)).toEqual(["s1", "s3"]);
    expect(commercialIdentities(swapped)).toEqual(["TOUR-A::s1", "TOUR-A::s3"]);
  });

  it("routed validation never changes membership — it surfaces a tradeoff", () => {
    const result = applyRoutedValidation(base, { infeasibleMomentIds: ["s2"] });
    expect(result.membershipChanged).toBe(false);
    expect(result.state.moments.map((m) => m.id)).toEqual(["s1", "s2"]);
    expect(result.state.pendingTradeoffs).toHaveLength(1);
    expect(result.state.pendingTradeoffs[0].resolved).toBe(false);
  });
});
