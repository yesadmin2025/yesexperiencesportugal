import { describe, expect, it } from "vitest";

import type { DestinationIntent, Feeling, Interest } from "@/components/studio-v3/types";
import { buildDirectorContext } from "@/lib/studio-v3/directorContext";
import { isDirectorOptionId } from "@/lib/studio-v3/questionOptionCatalog";
import {
  appendQuestionAnswer,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";
import { deriveSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import type { SemanticSourceEvent } from "@/lib/studio-v3/semanticSourceEvents";
import {
  decideStudioQuestion,
  questionDecisionFingerprint,
  type StudioQuestionDecision,
} from "@/lib/studio-v3/studioQuestionDirector";
import type { TimingConflict } from "@/lib/studio-v3/timeDomain";

function profileOf(options: {
  interests: readonly Interest[];
  feeling?: Feeling | null;
  priorityInterests?: readonly Interest[];
  events?: readonly SemanticSourceEvent[];
}) {
  return deriveSemanticProfile({
    feeling: options.feeling ?? null,
    interests: options.interests,
    priorityInterests: options.priorityInterests,
    events: options.events,
  });
}

function contextOf(destinationIntent: DestinationIntent, timingConflict?: TimingConflict) {
  return buildDirectorContext({ destinationIntent, timingConflict: timingConflict ?? null });
}

/** Real-shaped BUILD-1 truth. The director never invents timing. */
const TIME_CONFLICT_FIXTURE: TimingConflict = {
  kind: "time-overflow",
  stage: "planning",
  requestedDimensions: [
    { dimension: "hands-on-traditions", status: "represented", representedByStopIds: ["stop-a"] },
    { dimension: "atlantic-coast", status: "represented", representedByStopIds: ["stop-b"] },
    { dimension: "wine-table", status: "unfitted", representedByStopIds: [] },
  ],
  unfittedRequests: [
    { dimension: "wine-table", candidateStopIds: ["stop-c"], minimumExtraMinutesNeeded: 95 },
  ],
  overflowMinutes: 95,
  options: [
    { option: "extend-duration", toClass: "full-day", extraMinutesGained: 270 },
    {
      option: "swap-moment",
      dropStopId: "stop-b",
      forStopId: "stop-c",
      minutesRecovered: 80,
      dimensionCost: "atlantic-coast",
    },
  ],
};

function answerOf(decision: StudioQuestionDecision, selected: string[]): QuestionAnswerEvent {
  return {
    questionKey: decision.questionKey!,
    uncertaintyKey: decision.uncertaintyKey!,
    targetKeys: [],
    offeredOptionIds: decision.choiceKeys!,
    selectedOptionIds: selected,
    semanticEffects: [],
    dependencyFingerprint: decision.dependencyFingerprint!,
    source: "director",
  };
}

function assertOptionsAreCatalogued(decision: StudioQuestionDecision) {
  for (const option of decision.options ?? []) {
    expect(isDirectorOptionId(option.id)).toBe(true);
  }
}

const FOUR_FORK_INTERESTS: Interest[] = [
  "faith",
  "heritage",
  "wine",
  "local-life",
  "coast",
  "nature",
  "hands-on",
];

describe("Pass 2 — deterministic question director", () => {
  it("C. an already-known wine preference never triggers a wine confirmation", () => {
    const decision = decideStudioQuestion({
      context: contextOf("arrabida-setubal-azeitao"),
      profile: profileOf({ interests: ["wine"], feeling: "wine-food" }),
    });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.questionKey).toBeUndefined();
  });

  it("D. a decisive single direction asks nothing", () => {
    const context = contextOf("lisbon-sintra-cascais");
    expect(context.candidateSignatureIds).toEqual(["sintra-cascais"]);
    const decision = decideStudioQuestion({
      context,
      profile: profileOf({ interests: ["coast", "nature"], feeling: "coastal" }),
    });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("no-material-uncertainty");
  });

  it("E. faith + heritage on an open intent forks sanctuary vs Templar", () => {
    const decision = decideStudioQuestion({
      context: contextOf("no-preference"),
      profile: profileOf({ interests: ["faith", "heritage"] }),
    });
    expect(decision.shouldAsk).toBe(true);
    expect(decision.options!.map((option) => option.id)).toEqual([
      "faith-sanctuary-time",
      "faith-templar-heritage",
    ]);
    assertOptionsAreCatalogued(decision);
  });

  it("F. wine + heritage + local life forks Évora vs Talha", () => {
    const decision = decideStudioQuestion({
      context: contextOf("no-preference"),
      profile: profileOf({ interests: ["wine", "heritage", "local-life"] }),
    });
    expect(decision.shouldAsk).toBe(true);
    expect(decision.options!.map((option) => option.id)).toEqual([
      "wine-monumental-estates",
      "wine-clay-talha",
    ]);
  });

  it("G. coast + nature forks Arrábida vs southwest", () => {
    const decision = decideStudioQuestion({
      context: contextOf("anywhere-special"),
      profile: profileOf({ interests: ["coast", "nature"] }),
    });
    expect(decision.shouldAsk).toBe(true);
    expect(decision.options!.map((option) => option.id)).toEqual([
      "coast-from-the-water",
      "coast-remote-southwest",
    ]);
  });

  it("H. a BUILD-1 time conflict mirrors its EXACT options, never a generic pair", () => {
    const decision = decideStudioQuestion({
      context: contextOf("no-preference", TIME_CONFLICT_FIXTURE),
      profile: profileOf({
        interests: ["hands-on", "coast", "wine"],
        events: [
          {
            domain: "duration",
            value: "half-day",
            provenance: "explicit-ui",
            polarity: "positive",
            confidence: 1,
          },
        ],
      }),
    });
    expect(decision.shouldAsk).toBe(true);
    expect(decision.uncertaintyKey).toBe("time:tradeoff");
    // Exactly the actions BUILD 1 supplied, in the supplied order.
    expect(decision.options!.map((option) => option.id)).toEqual([
      "time-extend-duration",
      "time-swap-moment",
    ]);
    expect(decision.options!.map((option) => option.timingOption)).toEqual(
      TIME_CONFLICT_FIXTURE.options,
    );
    expect(decision.reason).toBe("time-conflict:time-overflow");
  });

  it("H2. a swap-only conflict never offers an extension BUILD 1 did not supply", () => {
    const swapOnly: TimingConflict = {
      ...TIME_CONFLICT_FIXTURE,
      options: [
        {
          option: "swap-moment",
          dropStopId: "stop-b",
          forStopId: "stop-c",
          minutesRecovered: 80,
          dimensionCost: "atlantic-coast",
        },
        {
          option: "swap-moment",
          dropStopId: "stop-a",
          forStopId: "stop-c",
          minutesRecovered: 95,
          dimensionCost: "hands-on-traditions",
        },
      ],
    };
    const decision = decideStudioQuestion({
      context: contextOf("no-preference", swapOnly),
      profile: profileOf({ interests: ["hands-on"] }),
    });
    const ids = decision.options!.map((option) => option.id);
    expect(ids).toEqual(["time-swap-moment", "time-swap-moment"]);
    expect(ids).not.toContain("time-extend-duration");
    // Two swap instances remain distinguishable by choiceKey.
    expect(decision.choiceKeys![0]).not.toBe(decision.choiceKeys![1]);
    expect(new Set(decision.choiceKeys!).size).toBe(2);
  });

  it("H3. an empty options list fails closed — no manufactured time question", () => {
    const decision = decideStudioQuestion({
      context: contextOf("lisbon-sintra-cascais", { ...TIME_CONFLICT_FIXTURE, options: [] }),
      profile: profileOf({ interests: ["heritage"] }),
    });
    expect(decision.shouldAsk).toBe(false);
  });

  it("H4. a payload change under the same action kind invalidates the fingerprint", () => {
    const profile = profileOf({ interests: ["hands-on"] });
    const before = decideStudioQuestion({
      context: contextOf("no-preference", TIME_CONFLICT_FIXTURE),
      profile,
    });
    const changed: TimingConflict = {
      ...TIME_CONFLICT_FIXTURE,
      options: [
        { option: "extend-duration", toClass: "full-day", extraMinutesGained: 300 },
        TIME_CONFLICT_FIXTURE.options[1],
      ],
    };
    const after = decideStudioQuestion({ context: contextOf("no-preference", changed), profile });
    expect(after.options!.map((option) => option.id)).toEqual(
      before.options!.map((option) => option.id),
    );
    expect(after.dependencyFingerprint).not.toBe(before.dependencyFingerprint);
    expect(after.decisionFingerprint).not.toBe(before.decisionFingerprint);
  });

  it("H5. an anchors-only conflict emits exactly the anchor tradeoff", () => {
    const anchorsOnly: TimingConflict = {
      ...TIME_CONFLICT_FIXTURE,
      options: [{ option: "choose-between-anchors", anchorStopIds: ["stop-a", "stop-b"] }],
    };
    const decision = decideStudioQuestion({
      context: contextOf("no-preference", anchorsOnly),
      profile: profileOf({ interests: ["hands-on"] }),
    });
    expect(decision.options!.map((option) => option.id)).toEqual([
      "time-choose-between-anchors",
    ]);
  });

  it("H6. reordering an unordered anchor set does not change the timing identity", () => {
    const profile = profileOf({ interests: ["hands-on"] });
    const make = (anchorStopIds: string[]) =>
      decideStudioQuestion({
        context: contextOf("no-preference", {
          ...TIME_CONFLICT_FIXTURE,
          options: [{ option: "choose-between-anchors", anchorStopIds }],
        }),
        profile,
      });
    expect(make(["stop-b", "stop-a"]).dependencyFingerprint).toBe(
      make(["stop-a", "stop-b"]).dependencyFingerprint,
    );
  });

  it("H7. a changed swap target invalidates the fingerprint", () => {
    const profile = profileOf({ interests: ["hands-on"] });
    const base = decideStudioQuestion({
      context: contextOf("no-preference", TIME_CONFLICT_FIXTURE),
      profile,
    });
    const changed = decideStudioQuestion({
      context: contextOf("no-preference", {
        ...TIME_CONFLICT_FIXTURE,
        options: [
          TIME_CONFLICT_FIXTURE.options[0],
          {
            option: "swap-moment",
            dropStopId: "stop-a",
            forStopId: "stop-c",
            minutesRecovered: 80,
            dimensionCost: "atlantic-coast",
          },
        ],
      }),
      profile,
    });
    expect(changed.dependencyFingerprint).not.toBe(base.dependencyFingerprint);
  });



  it("I. identical structured inputs yield a deep-equal decision", () => {
    const a = decideStudioQuestion({
      context: contextOf("no-preference"),
      profile: profileOf({ interests: ["faith", "heritage"] }),
    });
    const b = decideStudioQuestion({
      context: contextOf("no-preference"),
      profile: profileOf({ interests: ["faith", "heritage"] }),
    });
    expect(a).toEqual(b);
  });

  it("J. an answered question with the same dependency fingerprint is not repeated", () => {
    const context = contextOf("no-preference");
    const profile = profileOf({ interests: ["faith", "heritage"] });
    const first = decideStudioQuestion({ context, profile });
    const history = [answerOf(first, ["faith-sanctuary-time"])];
    const second = decideStudioQuestion({ context, profile, history });
    expect(second.questionKey).not.toBe(first.questionKey);
  });

  it("K. an upstream change invalidates only the dependent answer", () => {
    const context = contextOf("no-preference");
    const base = profileOf({ interests: ["faith", "heritage", "coast", "nature"] });

    let history: QuestionAnswerEvent[] = [];
    const faith = decideStudioQuestion({ context, profile: base, history });
    expect(faith.uncertaintyKey).toBe("fork:faith-direction");
    history = appendQuestionAnswer(history, answerOf(faith, ["faith-sanctuary-time"]));

    const coast = decideStudioQuestion({ context, profile: base, history });
    expect(coast.uncertaintyKey).toBe("fork:coast-geography");
    history = appendQuestionAnswer(history, answerOf(coast, ["coast-from-the-water"]));

    expect(decideStudioQuestion({ context, profile: base, history }).shouldAsk).toBe(false);

    // Coast becomes a declared lead: only the coast fingerprint changes.
    const changed = profileOf({
      interests: ["faith", "heritage", "coast", "nature"],
      priorityInterests: ["coast"],
    });
    const after = decideStudioQuestion({ context, profile: changed, history });
    expect(after.shouldAsk).toBe(true);
    expect(after.uncertaintyKey).toBe("fork:coast-geography");
    expect(after.dependencyFingerprint).not.toBe(coast.dependencyFingerprint);
    // The unrelated faith answer stays valid.
    const faithFingerprintUnchanged = decideStudioQuestion({
      context,
      profile: changed,
      history,
    });
    expect(faithFingerprintUnchanged.uncertaintyKey).not.toBe("fork:faith-direction");
  });

  it("Q. an explicit wine exclusion beats interest and never produces a wine fork", () => {
    const profile = profileOf({
      interests: ["wine", "heritage", "local-life"],
      events: [
        {
          domain: "interest",
          value: "wine",
          provenance: "rejection",
          polarity: "negative",
          confidence: 1,
        },
        {
          domain: "interest",
          value: "wine",
          provenance: "ai-interpretation",
          polarity: "positive",
          confidence: 0.9,
        },
      ],
    });
    const decision = decideStudioQuestion({ context: contextOf("no-preference"), profile });
    expect(decision.uncertaintyKey).not.toBe("fork:alentejo-wine-direction");
    expect(decision.shouldAsk).toBe(false);
  });

  it("R. permutations of equal-priority interests yield the same decision", () => {
    const context = contextOf("no-preference");
    const a = decideStudioQuestion({
      context,
      profile: profileOf({ interests: ["faith", "heritage", "coast", "nature"] }),
    });
    const b = decideStudioQuestion({
      context,
      profile: profileOf({ interests: ["nature", "coast", "heritage", "faith"] }),
    });
    expect(a).toEqual(b);
  });

  it("S. true 0→N termination: more than three questions, then a natural stop", () => {
    const context = contextOf("no-preference");
    const profile = profileOf({ interests: FOUR_FORK_INTERESTS });

    let history: QuestionAnswerEvent[] = [];
    const emitted: string[] = [];
    // Test-only safety guard. NOT product logic.
    for (let guard = 0; guard < 25; guard += 1) {
      const decision = decideStudioQuestion({ context, profile, history });
      if (!decision.shouldAsk) break;
      assertOptionsAreCatalogued(decision);
      emitted.push(decision.uncertaintyKey!);
      history = appendQuestionAnswer(
        history,
        answerOf(decision, [decision.options![0].choiceKey]),
      );
    }

    expect(emitted).toEqual([
      "fork:faith-direction",
      "fork:alentejo-wine-direction",
      "fork:coast-geography",
      "fork:hands-on-craft",
      "fork:wine-day-depth",
      "fork:estuary-vs-wild-coast",
    ]);
    expect(emitted.length).toBeGreaterThan(3);
    expect(decideStudioQuestion({ context, profile, history }).shouldAsk).toBe(false);
  });

  it("T. a pure skip does not immediately repeat the same question", () => {
    const context = contextOf("no-preference");
    const profile = profileOf({ interests: ["faith", "heritage", "coast", "nature"] });
    const first = decideStudioQuestion({ context, profile });
    const history = [answerOf(first, [])];
    const second = decideStudioQuestion({ context, profile, history });
    expect(second.questionKey).not.toBe(first.questionKey);
    expect(second.uncertaintyKey).toBe("fork:coast-geography");
  });

  it("X. reversing ordered option ids changes the decision fingerprint", () => {
    const decision = decideStudioQuestion({
      context: contextOf("no-preference"),
      profile: profileOf({ interests: ["faith", "heritage"] }),
    });
    const ordered = decision.options!.map((option) => option.id);
    const forward = questionDecisionFingerprint({
      questionKey: decision.questionKey!,
      optionIds: ordered,
      dependencyFingerprint: decision.dependencyFingerprint!,
    });
    const reversed = questionDecisionFingerprint({
      questionKey: decision.questionKey!,
      optionIds: [...ordered].reverse(),
      dependencyFingerprint: decision.dependencyFingerprint!,
    });
    expect(forward).toBe(decision.decisionFingerprint);
    expect(reversed).not.toBe(forward);
  });
});
