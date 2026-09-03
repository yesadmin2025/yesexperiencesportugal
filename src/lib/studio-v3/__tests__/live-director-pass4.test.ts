import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import { describe, expect, it } from "vitest";

import { presentDirectorQuestion } from "@/components/studio-v3/directorQuestionPresentation";
import { decideLivingAtlasSignature } from "@/components/studio-v3/livingAtlasDecision";
import { validateDecisionProfile } from "@/components/studio-v3/livingAtlasTaxonomy";
import { appendLiveDirectorAnswer } from "@/lib/studio-v3/studioQuestionHistoryBridge";
import {
  deriveStudioDirectorRuntime,
  type StudioDirectorRuntimeInput,
} from "@/lib/studio-v3/studioDirectorRuntime";
import {
  buildStudioSemanticProfile,
  deriveStudioIntelligence,
} from "@/lib/studio-v3/livingAtlasBridge";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import { projectSemanticProfile } from "@/lib/studio-v3/semanticProfileProjection";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";

/** Replays the LIVE 0→N loop exactly as StudioV3 does. */
function runLiveLoop(input: StudioDirectorRuntimeInput, maxSteps = 24) {
  let history: QuestionAnswerEvent[] = [...(input.questionHistory ?? [])];
  const askedKeys: string[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const runtime = deriveStudioDirectorRuntime({ ...input, questionHistory: history });
    const question = presentDirectorQuestion(runtime.decision);
    if (!question) return { history, askedKeys, terminated: true };
    askedKeys.push(question.questionKey);
    history = appendLiveDirectorAnswer(history, {
      questionKey: runtime.decision.questionKey!,
      uncertaintyKey: runtime.decision.uncertaintyKey!,
      dependencyFingerprint: runtime.decision.dependencyFingerprint ?? "",
      offeredOptionIds: question.offeredOptionIds,
      selectedOptionId: question.offeredOptionIds[0],
    });
  }
  return { history, askedKeys, terminated: false };
}

describe("Pass 4 — live Director runtime is the only question authority", () => {
  it("asks MORE than three real questions and still terminates structurally", () => {
    const result = runLiveLoop({
      feeling: "wine-food",
      interests: ["wine", "coast", "heritage", "local-life", "hands-on"],
      rhythm: "balanced",
      // A real open destination — never the fail-closed `null` context, which
      // would let this test pass with zero questions asked.
      destinationIntent: "no-preference",
    });
    expect(result.terminated).toBe(true);
    // Non-vacuous: the old product cap of 3 is genuinely gone.
    expect(result.askedKeys.length).toBeGreaterThan(3);
    // Never re-asks the same question once it produced real progress.
    expect(new Set(result.askedKeys).size).toBe(result.askedKeys.length);
  });

  it("returns a SECOND material question after the first live answer", () => {
    const input: StudioDirectorRuntimeInput = {
      feeling: "wine-food",
      interests: ["wine", "coast", "heritage", "local-life", "hands-on"],
      rhythm: "balanced",
      destinationIntent: "no-preference",
    };
    const first = deriveStudioDirectorRuntime(input);
    const q1 = presentDirectorQuestion(first.decision)!;
    expect(q1).not.toBeNull();
    const history = appendLiveDirectorAnswer([], {
      questionKey: first.decision.questionKey!,
      uncertaintyKey: first.decision.uncertaintyKey!,
      dependencyFingerprint: first.decision.dependencyFingerprint ?? "",
      offeredOptionIds: q1.offeredOptionIds,
      selectedOptionId: q1.offeredOptionIds[0],
    });
    const second = deriveStudioDirectorRuntime({ ...input, questionHistory: history });
    const q2 = presentDirectorQuestion(second.decision);
    expect(q2).not.toBeNull();
    expect(q2!.questionKey).not.toBe(q1.questionKey);
  });


  it("asks nothing when the traveller has said nothing material", () => {
    const runtime = deriveStudioDirectorRuntime({ feeling: null, interests: [] });
    expect(presentDirectorQuestion(runtime.decision)).toBeNull();
  });

  it("presents the Director's ordered options verbatim, or nothing at all", () => {
    const runtime = deriveStudioDirectorRuntime({
      feeling: "coastal",
      interests: ["coast"],
      rhythm: "slow",
    });
    const question = presentDirectorQuestion(runtime.decision);
    if (!question) return;
    expect(question.offeredOptionIds).toEqual(
      runtime.decision.options!.map((option) => option.choiceKey),
    );
    for (const option of question.options) {
      expect(option.label.trim().length).toBeGreaterThan(0);
      // Never a machine key in traveller-facing copy.
      expect(option.label).not.toMatch(/^question:|^uncertainty:|[{[]/);
    }
  });

  it("fails closed on an unknown question key instead of leaking machine copy", () => {
    expect(
      presentDirectorQuestion({
        shouldAsk: true,
        reason: "test",
        questionKey: "question:not-a-real-question",
        uncertaintyKey: "uncertainty:x",
        options: [
          { id: "coast-wild-beaches", choiceKey: "coast-wild-beaches", kind: "discovery" },
          { id: "coast-clifftop-views", choiceKey: "coast-clifftop-views", kind: "discovery" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
      }),
    ).toBeNull();
  });
});

describe("Pass 4 — the uncapped decision profile is the scoring authority", () => {
  it("keeps every stated interest in the decision profile", () => {
    const projection = projectSemanticProfile(
      buildStudioSemanticProfile({
        feeling: "wine-food",
        interests: ["wine", "coast", "heritage", "local-life", "hands-on"],
      }),
    );
    const full = projection.fullDecisionProfile;
    expect(full).not.toBeNull();
    expect(full!.selected.length).toBeGreaterThan(3);
    expect(validateDecisionProfile(full!).ok).toBe(true);
    // Nothing is silently dropped: the legacy view reports what it deferred.
    expect(projection.deferred.length).toBeGreaterThan(0);
  });

  it("scores every real discovery answer, not just the first", () => {
    const projection = projectSemanticProfile(
      buildStudioSemanticProfile({ feeling: "wine-food", interests: ["wine", "heritage"] }),
    );
    const profile = projection.fullDecisionProfile!;
    const one = decideLivingAtlasSignature({
      profile,
      profileContract: "full-decision",
      discoverySignals: ["roman-talha-family"],
    });
    const two = decideLivingAtlasSignature({
      profile,
      profileContract: "full-decision",
      discoverySignals: ["roman-talha-family", "roman-talha-family"],
    });
    // Deduped: the same answer twice is still one answer.
    expect(two.ranked[0].totalScore).toBe(one.ranked[0].totalScore);
    expect(one.ranked[0].evidence).toContain("signal:roman-talha-family");
  });
});

describe("Pass 4 closure — no fixed interest cap in the LIVE Studio", () => {
  it("StudioV3 source contains no maxSelected={4} / MAX_INTERESTS = 4 authority", () => {
    const source = readFileSync(
      resolvePath(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/maxSelected=\{\s*4\s*\}/);
    expect(source).not.toMatch(/MAX_INTERESTS\s*[:=]\s*4/);
    expect(source).not.toMatch(/const\s+max\s*=\s*4/);
    expect(source).not.toContain("perfectly paced");
    expect(source).not.toContain("Four moments");
  });
});

/** Canonical live answer with a real offered set (authoritative by contract). */
function directorAnswer(
  history: QuestionAnswerEvent[],
  family: string,
  offeredOptionIds: string[],
  selectedOptionId: string,
): QuestionAnswerEvent[] {
  return appendLiveDirectorAnswer(history, {
    questionKey: `question:${family}`,
    uncertaintyKey: `uncertainty:${family}`,
    dependencyFingerprint: `fingerprint:${family}`,
    offeredOptionIds,
    selectedOptionId,
  });
}

describe("Pass 4 closure — canonical history drives modern intelligence", () => {
  it("consumes TWO DISTINCT discovery signals from canonical history", () => {
    let history: QuestionAnswerEvent[] = [];
    history = directorAnswer(
      history,
      "wine",
      ["wine-clay-talha", "wine-cellar-depth"],
      "wine-clay-talha",
    );
    history = directorAnswer(
      history,
      "coast",
      ["coast-wild-beaches", "coast-from-the-water"],
      "coast-wild-beaches",
    );

    const intelligence = deriveStudioIntelligence({
      feeling: "wine-food",
      interests: ["wine", "coast"],
      rhythm: "balanced",
      destinationIntent: null,
      // refinement deliberately absent — history is the only authority.
      questionHistory: history,
    });

    const evidence = (intelligence.decision?.ranked ?? []).flatMap((r) => r.evidence);
    expect(evidence).toContain("signal:roman-talha-family");
    expect(evidence).toContain("signal:arrabida-beach-picnic");
  });

  it("scores the 4th/5th dimension under full-decision while legacy stays <= 3", () => {
    const narrow = projectSemanticProfile(
      buildStudioSemanticProfile({ feeling: "wine-food", interests: ["wine", "heritage"] }),
    );
    const wide = projectSemanticProfile(
      buildStudioSemanticProfile({
        feeling: "wine-food",
        interests: ["wine", "heritage", "coast", "local-life", "hands-on"],
      }),
    );
    expect(wide.legacyCompatibilityProjection!.selected.length).toBeLessThanOrEqual(3);
    expect(wide.fullDecisionProfile!.selected.length).toBeGreaterThan(3);

    const narrowTop = decideLivingAtlasSignature({
      profile: narrow.fullDecisionProfile!,
      profileContract: "full-decision",
    }).ranked[0];
    const wideSame = decideLivingAtlasSignature({
      profile: wide.fullDecisionProfile!,
      profileContract: "full-decision",
    }).ranked.find((r) => r.signatureId === narrowTop.signatureId)!;

    expect(wideSame.supportingCoverage.length).toBeGreaterThan(
      narrowTop.supportingCoverage.length,
    );
    expect(wideSame.totalScore).not.toBe(narrowTop.totalScore);
  });

  it("route composition follows canonical history with refinement null", () => {
    const base = {
      feeling: "wine-food" as const,
      companions: "couple" as const,
      rhythm: "balanced" as const,
      interests: ["wine"] as const,
      pickup: "lisbon" as const,
      refinement: null,
    };
    const history = directorAnswer(
      [],
      "wine",
      ["wine-clay-talha", "wine-cellar-depth"],
      "wine-clay-talha",
    );
    const withoutHistory = resolveStudioV3Route(base);
    const withHistory = resolveStudioV3Route({ ...base, questionHistory: history });
    expect(withHistory.skeletonTourKey).not.toBe(withoutHistory.skeletonTourKey);
  });

  it("honours a clear Director decision as an explicit route preference", () => {
    const history = directorAnswer(
      [],
      "heritage-depth",
      ["templars-and-university", "monuments-and-palaces"],
      "templars-and-university",
    );
    const resolved = resolveStudioV3Route({
      feeling: "culture",
      companions: "couple",
      rhythm: "balanced",
      interests: ["heritage"],
      pickup: "lisbon",
      refinement: null,
      questionHistory: history,
    });
    const intelligence = deriveStudioIntelligence({
      feeling: "culture",
      interests: ["heritage"],
      rhythm: "balanced",
      destinationIntent: null,
      refinement: null,
      questionHistory: history,
    });

    expect(intelligence.decision?.status).toBe("clear");
    expect(intelligence.preferredTourId).toBe("tomar-coimbra");
    expect(resolved.skeletonTourKey).toBe("tomar-coimbra");
  });
});
