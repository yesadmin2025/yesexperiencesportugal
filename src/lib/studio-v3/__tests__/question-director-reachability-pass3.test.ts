/**
 * BUILD 2 — PASS 3. Sequential reachability certification.
 *
 * The authority here is the REAL 0→N Question Director replayed over a growing
 * question history. Nothing is certified by the existence of a static mapping,
 * and nothing is paired Cartesian-style.
 */

import { describe, expect, it } from "vitest";

import { LIVING_ATLAS_SIGNATURE_IDS } from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  DISCOVERY_SIGNAL_TARGET,
} from "@/components/studio-v3/livingAtlasDecision";
import type { AdaptiveRefinementId, Interest } from "@/components/studio-v3/types";
import { buildCapabilityMatrix } from "@/lib/studio-v3/capabilityMatrix";
import {
  canEmitRefinementSequentially,
  sequentialEmittableRefinements,
  sequentialPathFor,
  replaySequentialPathAnswers,
  sequentialQuestionTree,
  verifySequentialPath,
  type PublicBaseState,
} from "@/lib/studio-v3/publicRefinementPaths";
import { runReachabilityReport } from "@/lib/studio-v3/reachabilitySimulator";
import { buildDirectorContext } from "@/lib/studio-v3/directorContext";
import { deriveSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import { decideStudioQuestion } from "@/lib/studio-v3/studioQuestionDirector";
import { appendQuestionAnswer, type QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";

function base(
  interests: readonly Interest[],
  feeling: PublicBaseState["feeling"] = null,
  destinationIntent: PublicBaseState["destinationIntent"] = "no-preference",
): PublicBaseState {
  return { feeling, interests, destinationIntent };
}

describe("Pass 3 — sequential public question paths", () => {
  it("asks more than one question and certifies later refinements only after history", () => {
    const multi = base(["faith", "heritage", "wine", "local-life", "coast", "nature", "hands-on"]);
    const tree = sequentialQuestionTree(multi);

    const deepest = Math.max(...tree.paths.map((path) => path.steps.length));
    expect(deepest).toBeGreaterThan(1);

    // A later refinement is NOT offered by the very first question — it only
    // becomes emittable once the earlier answers are in history.
    const later = tree.paths.find((path) => path.steps.length > 1)!;
    const profile = deriveSemanticProfile({ feeling: multi.feeling, interests: [...multi.interests] });
    const context = buildDirectorContext({ destinationIntent: multi.destinationIntent });
    const first = decideStudioQuestion({ context, profile });
    expect(first.choiceKeys).not.toContain(later.refinement);
    expect(verifySequentialPath(later)).toBe(true);
  });

  it("is deterministic: the same base yields a deep-equal path tree", () => {
    const a = sequentialQuestionTree(base(["coast", "nature"], "coastal"));
    const b = JSON.parse(
      JSON.stringify(sequentialQuestionTree({ ...base(["coast", "nature"], "coastal") })),
    );
    expect(JSON.parse(JSON.stringify(a))).toEqual(b);
  });

  it("equal-priority interest order does not change the sequential meaning", () => {
    const a = sequentialQuestionTree(base(["faith", "heritage", "coast", "nature"]));
    const b = sequentialQuestionTree(base(["nature", "coast", "heritage", "faith"]));
    expect(a.refinements).toEqual(b.refinements);
    expect(a.paths.map((p) => p.steps.map((s) => s.questionKey))).toEqual(
      b.paths.map((p) => p.steps.map((s) => s.questionKey)),
    );
  });

  it("a pure skip does not loop and branch exploration terminates without a numeric cap", () => {
    const state = base(["faith", "heritage", "coast", "nature"]);
    const profile = deriveSemanticProfile({ feeling: null, interests: [...state.interests] });
    const context = buildDirectorContext({ destinationIntent: state.destinationIntent });

    let history: QuestionAnswerEvent[] = [];
    const asked: string[] = [];
    // Test-only safety guard. Never product logic.
    for (let guard = 0; guard < 50; guard += 1) {
      const decision = decideStudioQuestion({ context, profile, history });
      if (!decision.shouldAsk) break;
      asked.push(decision.questionKey!);
      // Pure skip: no selection, no semantic effect.
      history = appendQuestionAnswer(history, {
        questionKey: decision.questionKey!,
        uncertaintyKey: decision.uncertaintyKey!,
        targetKeys: [],
        offeredOptionIds: decision.choiceKeys!,
        selectedOptionIds: [],
        semanticEffects: [],
        dependencyFingerprint: decision.dependencyFingerprint!,
        source: "director",
      });
    }
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked.length).toBeLessThan(50);

    // The tree itself terminates.
    expect(sequentialQuestionTree(state).paths.length).toBeGreaterThan(0);
  });

  it("a refinement never offered in the base's tree is NOT publicly reachable", () => {
    const handsOnly = base(["hands-on"], "hands-on");
    const offered = sequentialEmittableRefinements(handsOnly);
    expect(offered).toContain("hands-paint-tile");
    expect(offered).not.toContain("coast-remote-southwest");
    expect(canEmitRefinementSequentially(handsOnly, "coast-remote-southwest")).toBe(false);
    expect(sequentialPathFor(handsOnly, "coast-remote-southwest")).toBeNull();
  });

  const DOORS: Array<[string, PublicBaseState, AdaptiveRefinementId[]]> = [
    ["faith proves Fátima and Tomar/Coimbra", base(["faith"], "faith"), [
      "faith-sanctuary-time",
      "faith-templar-heritage",
    ]],
    [
      "wine + heritage + local life proves Évora vs Roman Talha",
      base(["wine", "heritage", "local-life"]),
      ["wine-monumental-estates", "wine-clay-talha"],
    ],
    [
      "coast + nature proves Arrábida vs Vicentine",
      base(["coast", "nature"], "coastal"),
      ["coast-from-the-water", "coast-remote-southwest"],
    ],
    [
      "hands-on proves tile vs cheese",
      base(["hands-on"], "hands-on"),
      ["hands-paint-tile", "hands-make-cheese"],
    ],
  ];

  it.each(DOORS)("%s", (_name, state, refinements) => {
    for (const refinement of refinements) {
      const path = sequentialPathFor(state, refinement);
      expect(path).toBeTruthy();
      expect(verifySequentialPath(path!)).toBe(true);
      const last = path!.steps[path!.steps.length - 1];
      expect(last.offeredChoiceKeys).toContain(refinement);
      expect(last.selectedRefinement).toBe(refinement);
    }
  });

  it("all twelve directions have a genuine sequential public signal path", () => {
    const report = buildCapabilityMatrix();
    expect(report.directions).toHaveLength(12);
    for (const direction of report.directions) {
      expect(direction.signals.discoverySignal).toBe(
        DISCOVERY_SIGNAL_BY_SIGNATURE[direction.signatureId],
      );
      expect(direction.signals.hasPublicSignalPath).toBe(true);
      const example = direction.signals.examplePublicPath!;
      expect(example).toBeTruthy();
      expect(example.steps.length).toBeGreaterThan(0);
      expect(verifySequentialPath(example)).toBe(true);
      expect(example.targetSignal).toBe(DISCOVERY_SIGNAL_BY_SIGNATURE[direction.signatureId]);
      // CAUSALITY: the proof's final DERIVED answer state must really carry
      // the target signal and its direction — not merely have offered it.
      expect(example.finalDiscoverySignals).toContain(example.targetSignal);
      expect(example.finalDirectionIds).toContain(
        DISCOVERY_SIGNAL_TARGET[example.targetSignal!],
      );
      expect(replaySequentialPathAnswers(example).selectedDiscoverySignals).toContain(
        example.targetSignal,
      );

    }
    expect(new Set(LIVING_ATLAS_SIGNATURE_IDS).size).toBe(12);
  });

  it("the reachability report has zero dead directions using only proven paths", () => {
    const report = runReachabilityReport();
    expect(report.deadDirections).toEqual([]);
    for (const direction of report.directions) {
      expect(direction.top1Count).toBeGreaterThan(0);
    }
  });
});
