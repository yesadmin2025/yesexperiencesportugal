import { describe, expect, it } from "vitest";

import {
  appendQuestionAnswer,
  findAnswer,
  isQuestionAnswered,
  isUncertaintyResolved,
  hasQuestionSemanticProgress,
  legacyRefinementToHistoryEvent,
  questionAnswerFingerprint,
  questionAnswerIdentity,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";
import { semanticEventFingerprint } from "@/lib/studio-v3/semanticSourceEvents";

const event: QuestionAnswerEvent = {
  questionKey: "q:coast-mode",
  uncertaintyKey: "u:coast-mode",
  targetKeys: ["interest:coast"],
  offeredOptionIds: ["a", "b"],
  selectedOptionIds: ["a"],
  semanticEffects: [
    {
      provenance: "refinement-answer",
      domain: "interest",
      value: "coast",
      polarity: "positive",
      confidence: 1,
    },
  ],
  dependencyFingerprint: "fp-1",
  source: "director",
};

describe("BUILD 2 Pass 1 — question history primitives", () => {
  it("A6 eventId/createdAt are excluded from identity, fingerprint and resolution", () => {
    const a: QuestionAnswerEvent = { ...event, eventId: "1", createdAt: "2026-01-01" };
    const b: QuestionAnswerEvent = { ...event, eventId: "2", createdAt: "2031-06-06" };
    expect(questionAnswerIdentity(a)).toEqual(questionAnswerIdentity(b));
    expect(questionAnswerFingerprint(a)).toBe(questionAnswerFingerprint(b));
    expect(isUncertaintyResolved([a], "u:coast-mode", "fp-1")).toBe(
      isUncertaintyResolved([b], "u:coast-mode", "fp-1"),
    );
    const effectA = { ...event.semanticEffects[0], eventId: "x", createdAt: "now" };
    expect(semanticEventFingerprint(effectA)).toBe(
      semanticEventFingerprint(event.semanticEffects[0]),
    );
  });

  it("A7 legacy refinement yields exactly one event, none for null", () => {
    const one = legacyRefinementToHistoryEvent("coast-wild-beaches");
    expect(one).not.toBeNull();
    // PASS 4 honesty: a legacy answer never fabricates a live selection from
    // an unknown offered set. It travels in the compatibility payload.
    expect(one?.selectedOptionIds).toEqual([]);
    expect(one?.legacyCompatibilityRefinementId).toBe("coast-wild-beaches");
    expect(one?.source).toBe("legacy-refinement");
    expect(legacyRefinementToHistoryEvent(null)).toBeNull();
    expect(legacyRefinementToHistoryEvent(undefined)).toBeNull();

    const history = one ? appendQuestionAnswer([], one) : [];
    expect(history).toHaveLength(1);
    expect(
      history.filter((h) => h.legacyCompatibilityRefinementId === "coast-wild-beaches"),
    ).toHaveLength(1);
  });

  it("A8 append is immutable and deterministic; lookups are stable", () => {
    const base: QuestionAnswerEvent[] = [];
    const next = appendQuestionAnswer(base, event);
    expect(base).toHaveLength(0);
    expect(next).toHaveLength(1);
    expect(appendQuestionAnswer(base, event)).toEqual(next);

    expect(isQuestionAnswered(next, "q:coast-mode")).toBe(true);
    expect(isQuestionAnswered(next, "q:missing")).toBe(false);
    expect(isUncertaintyResolved(next, "u:coast-mode", "fp-1")).toBe(true);
    expect(isUncertaintyResolved(next, "u:coast-mode", "fp-2")).toBe(false);
    expect(findAnswer(next, "q:coast-mode")).toEqual(event);
    expect(findAnswer(next, "q:none")).toBeNull();

    // A pure skip: no selection AND no semantic effect.
    const skipped = appendQuestionAnswer([], {
      ...event,
      selectedOptionIds: [],
      semanticEffects: [],
    });
    expect(isQuestionAnswered(skipped, "q:coast-mode")).toBe(false);
  });
});

describe("BUILD 2 Pass 1 audit — semantic progress", () => {
  it("a selected answer counts as answered and resolved", () => {
    const history = appendQuestionAnswer([], event);
    expect(isQuestionAnswered(history, "q:coast-mode")).toBe(true);
    expect(isUncertaintyResolved(history, "u:coast-mode", "fp-1")).toBe(true);
  });

  it("a pure skip is NOT answered and NOT resolved", () => {
    const history = appendQuestionAnswer([], {
      ...event,
      selectedOptionIds: [],
      semanticEffects: [],
    });
    expect(isQuestionAnswered(history, "q:coast-mode")).toBe(false);
    expect(isUncertaintyResolved(history, "u:coast-mode", "fp-1")).toBe(false);
  });

  it("a semantic-effect-only answer with no option id is answered and resolved", () => {
    const history = appendQuestionAnswer([], { ...event, selectedOptionIds: [] });
    expect(isQuestionAnswered(history, "q:coast-mode")).toBe(true);
    expect(isUncertaintyResolved(history, "u:coast-mode", "fp-1")).toBe(true);
  });

  it("legacy helper invents no offered set and no live selection", () => {
    const legacy = legacyRefinementToHistoryEvent("coast-wild-beaches");
    expect(legacy?.offeredOptionIds).toEqual([]);
    expect(legacy?.selectedOptionIds).toEqual([]);
    // The real traveller answer is still preserved, and still counts as
    // semantic progress, through the honest compatibility payload.
    expect(legacy?.legacyCompatibilityRefinementId).toBe("coast-wild-beaches");
    expect(legacy ? hasQuestionSemanticProgress(legacy) : false).toBe(true);
  });
});

describe("BUILD 2 Pass 1 audit — fingerprint collision safety", () => {
  it("delimiter-like characters cannot forge another question identity", () => {
    const a: QuestionAnswerEvent = { ...event, questionKey: "a", uncertaintyKey: "b:c" };
    const b: QuestionAnswerEvent = { ...event, questionKey: "a:b", uncertaintyKey: "c" };
    expect(questionAnswerFingerprint(a)).not.toBe(questionAnswerFingerprint(b));

    const c: QuestionAnswerEvent = { ...event, offeredOptionIds: ["x", "y|z"] };
    const d: QuestionAnswerEvent = { ...event, offeredOptionIds: ["x|y", "z"] };
    expect(questionAnswerFingerprint(c)).not.toBe(questionAnswerFingerprint(d));
  });

  it("confidence differences beyond 3 decimals change the semantic fingerprint", () => {
    const base = event.semanticEffects[0];
    expect(semanticEventFingerprint({ ...base, confidence: 0.12345 })).not.toBe(
      semanticEventFingerprint({ ...base, confidence: 0.12346 }),
    );
  });
});
