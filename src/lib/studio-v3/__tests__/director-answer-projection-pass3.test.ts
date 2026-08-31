/**
 * BUILD 2 — PASS 3 causal certification. Derived answer projection proofs.
 *
 * These tests prove CAUSALITY: a selected discovery choice becomes derived
 * answer state, that state is re-derived before the next director call, and a
 * certified path is only valid when its target signal really got projected.
 */

import { describe, expect, it } from "vitest";

import { DISCOVERY_SIGNAL_TARGET } from "@/components/studio-v3/livingAtlasDecision";
import { deriveDirectorAnswerProjection } from "@/lib/studio-v3/directorAnswerProjection";
import { buildDirectorContext } from "@/lib/studio-v3/directorContext";
import { decideStudioQuestion } from "@/lib/studio-v3/studioQuestionDirector";
import { deriveSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import { projectSemanticProfile } from "@/lib/studio-v3/semanticProfileProjection";
import {
  appendQuestionAnswer,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";
import {
  sequentialPathFor,
  sequentialQuestionTree,
  verifySequentialPath,
  type PublicBaseState,
  type SequentialPublicPath,
} from "@/lib/studio-v3/publicRefinementPaths";
import type { Interest } from "@/components/studio-v3/types";

function base(
  interests: readonly Interest[],
  feeling: PublicBaseState["feeling"] = null,
  destinationIntent: PublicBaseState["destinationIntent"] = "no-preference",
): PublicBaseState {
  return { feeling, interests, destinationIntent };
}

function event(partial: Partial<QuestionAnswerEvent>): QuestionAnswerEvent {
  return {
    questionKey: "question:test",
    uncertaintyKey: "uncertainty:test",
    targetKeys: [],
    offeredOptionIds: [],
    selectedOptionIds: [],
    semanticEffects: [],
    dependencyFingerprint: "fp",
    source: "director",
    ...partial,
  };
}

/** Re-derive everything the way the sequential replay does. */
function inputsFor(state: PublicBaseState, history: readonly QuestionAnswerEvent[]) {
  const answers = deriveDirectorAnswerProjection(history);
  const profile = deriveSemanticProfile({
    feeling: state.feeling,
    interests: [...state.interests],
    history,
  });
  return {
    answers,
    profile,
    context: buildDirectorContext({
      destinationIntent: state.destinationIntent,
      projection: projectSemanticProfile(profile),
      timingConflict: null,
      answers,
    }),
  };
}

describe("Pass 3 — derived director answer projection", () => {
  it("A. selecting wine-clay-talha derives its signal and target direction", () => {
    const history = [
      event({
        offeredOptionIds: ["wine-monumental-estates", "wine-clay-talha"],
        selectedOptionIds: ["wine-clay-talha"],
      }),
    ];
    const projection = deriveDirectorAnswerProjection(history);
    expect(projection.selectedDiscoverySignals).toEqual(["roman-talha-family"]);
    expect(projection.selectedDirectionIds).toEqual([
      DISCOVERY_SIGNAL_TARGET["roman-talha-family"],
    ]);

    // Opaque metadata never matters.
    const withMetadata = [
      { ...history[0], eventId: "abc", createdAt: "2026-01-01T00:00:00.000Z" },
    ];
    expect(deriveDirectorAnswerProjection(withMetadata)).toEqual(projection);
  });

  it("B. unknown selected strings produce no discovery state (fail closed)", () => {
    const projection = deriveDirectorAnswerProjection([
      event({ selectedOptionIds: ["totally-made-up", "wine-clay-talha-XX", ""] }),
    ]);
    expect(projection.selectedDiscoverySignals).toEqual([]);
    expect(projection.selectedDirectionIds).toEqual([]);
    expect(projection.selectedDiscoveryChoiceKeys).toEqual([]);
    expect(projection.selectedTimingChoiceKeys).toEqual([]);
  });

  it("B2. a pure skip produces no selected discovery state", () => {
    const projection = deriveDirectorAnswerProjection([
      event({ offeredOptionIds: ["wine-clay-talha"], selectedOptionIds: [] }),
    ]);
    expect(projection.selectedDiscoveryChoiceKeys).toEqual([]);
    expect(projection.selectedDiscoverySignals).toEqual([]);
  });

  it("C. two branches of the SAME fork derive genuinely different answer state", () => {
    const state = base(["hands-on"], "hands-on");
    const { profile, context } = inputsFor(state, []);
    const decision = decideStudioQuestion({ context, profile });
    expect(decision.shouldAsk).toBe(true);
    const [first, second] = decision.options!;

    const project = (choiceKey: string) =>
      deriveDirectorAnswerProjection([
        event({
          questionKey: decision.questionKey!,
          uncertaintyKey: decision.uncertaintyKey!,
          offeredOptionIds: decision.choiceKeys!,
          selectedOptionIds: [choiceKey],
        }),
      ]);

    const a = project(first.choiceKey);
    const b = project(second.choiceKey);
    expect(a.selectedDiscoverySignals).not.toEqual(b.selectedDiscoverySignals);
    expect(a.selectedDirectionIds).not.toEqual(b.selectedDirectionIds);
  });

  it("D. answering a fork resolves it materially; an independent fork may follow", () => {
    const state = base(["hands-on", "faith"], null);
    const first = inputsFor(state, []);
    const firstDecision = decideStudioQuestion({
      context: first.context,
      profile: first.profile,
    });
    expect(firstDecision.shouldAsk).toBe(true);
    const chosen = firstDecision.options![0];

    const history = appendQuestionAnswer(
      [],
      event({
        questionKey: firstDecision.questionKey!,
        uncertaintyKey: firstDecision.uncertaintyKey!,
        offeredOptionIds: firstDecision.choiceKeys!,
        selectedOptionIds: [chosen.choiceKey],
        dependencyFingerprint: firstDecision.dependencyFingerprint!,
      }),
    );

    const next = inputsFor(state, history);
    // The derived context really carries the selected discovery signal.
    expect(next.context.answers.selectedDiscoverySignals).toContain(chosen.discoverySignal!);

    const secondDecision = decideStudioQuestion({
      context: next.context,
      profile: next.profile,
      history,
    });
    // The SAME fork is never re-emitted...
    expect(secondDecision.questionKey).not.toBe(firstDecision.questionKey);
    // ...and an independent unresolved fork may still be asked.
    if (secondDecision.shouldAsk) {
      expect(secondDecision.uncertaintyKey).not.toBe(firstDecision.uncertaintyKey);
    }
  });

  it("D2. resolution is dependency-scoped: a stale answer does not settle the fork", () => {
    const state = base(["hands-on"], "hands-on");
    const { profile, context } = inputsFor(state, []);
    const decision = decideStudioQuestion({ context, profile });
    const chosen = decision.options![0];
    const history = [
      event({
        questionKey: decision.questionKey!,
        uncertaintyKey: decision.uncertaintyKey!,
        offeredOptionIds: decision.choiceKeys!,
        selectedOptionIds: [chosen.choiceKey],
        // Stale fingerprint: the inputs this fork depends on have changed, so
        // the old answer no longer speaks for the current question.
        dependencyFingerprint: "some-other-fingerprint",
      }),
    ];
    const next = inputsFor(state, history);
    const again = decideStudioQuestion({
      context: next.context,
      profile: next.profile,
      history,
    });
    // PASS 4 CORRECTION — no global signal-based suppression. Resolution is
    // judged against THIS uncertainty's CURRENT dependency fingerprint, so the
    // question is honestly asked again instead of being silently settled.
    expect(again.questionKey).toBe(decision.questionKey);
    expect(again.shouldAsk).toBe(true);
  });

  it("E. the sequential tree exposes derived final state containing the target", () => {
    const state = base(["wine", "heritage", "local-life"]);
    const path = sequentialPathFor(state, "wine-clay-talha");
    expect(path).toBeTruthy();
    expect(path!.targetSignal).toBe("roman-talha-family");
    expect(path!.finalDiscoverySignals).toContain("roman-talha-family");
    expect(path!.finalDirectionIds).toContain(
      DISCOVERY_SIGNAL_TARGET["roman-talha-family"],
    );
    expect(verifySequentialPath(path!)).toBe(true);
  });

  it("F. verifySequentialPath rejects a forged path that never selects the target", () => {
    const state = base(["hands-on"], "hands-on");
    const honest = sequentialPathFor(state, "hands-paint-tile")!;
    expect(verifySequentialPath(honest)).toBe(true);

    // Forgery 1: claim the target while selecting the sibling option.
    const sibling = honest.steps[honest.steps.length - 1].offeredChoiceKeys.find(
      (key) => key !== "hands-paint-tile",
    )!;
    const forged: SequentialPublicPath = {
      ...honest,
      steps: honest.steps.map((step, index) =>
        index === honest.steps.length - 1
          ? { ...step, selectedChoiceKey: sibling, selectedRefinement: "hands-paint-tile" }
          : step,
      ),
    };
    expect(verifySequentialPath(forged)).toBe(false);

    // Forgery 2: claim a target signal that no step ever projected.
    const mislabelled: SequentialPublicPath = { ...honest, targetSignal: "roman-talha-family" };
    expect(verifySequentialPath(mislabelled)).toBe(false);
  });

  it("H. pure skips still terminate and project no discovery state", () => {
    const state = base(["faith", "heritage", "coast", "nature"]);
    let history: QuestionAnswerEvent[] = [];
    const asked: string[] = [];
    for (let guard = 0; guard < 50; guard += 1) {
      const { profile, context } = inputsFor(state, history);
      const decision = decideStudioQuestion({ context, profile, history });
      if (!decision.shouldAsk) break;
      asked.push(decision.questionKey!);
      history = appendQuestionAnswer(
        history,
        event({
          questionKey: decision.questionKey!,
          uncertaintyKey: decision.uncertaintyKey!,
          offeredOptionIds: decision.choiceKeys!,
          selectedOptionIds: [],
          dependencyFingerprint: decision.dependencyFingerprint!,
        }),
      );
    }
    expect(asked.length).toBeLessThan(50);
    expect(new Set(asked).size).toBe(asked.length);
    expect(deriveDirectorAnswerProjection(history).selectedDiscoverySignals).toEqual([]);
  });

  it("I. permutation of equal-priority interests yields the same derived proofs", () => {
    const a = sequentialQuestionTree(base(["wine", "heritage", "local-life"]));
    const b = sequentialQuestionTree(base(["local-life", "heritage", "wine"]));
    expect(a.refinements).toEqual(b.refinements);
    expect(a.paths.map((p) => p.finalDiscoverySignals)).toEqual(
      b.paths.map((p) => p.finalDiscoverySignals),
    );
  });

  it("J. the answer projection imports no director/paths/capability/live layer", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/studio-v3/directorAnswerProjection.ts", "utf8"),
    );
    for (const forbidden of [
      "studioQuestionDirector",
      "publicRefinementPaths",
      "capabilityMatrix",
      "reachabilitySimulator",
      "questionUncertainty",
      "adaptiveQuestions",
    ]) {
      expect(source).not.toContain(`from "@/${forbidden}`);
      expect(source.includes(`/${forbidden}"`)).toBe(false);
    }
  });
});
