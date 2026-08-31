/**
 * BUILD 2 — Pass 4. Live switch: canonical question history, backward
 * hydration, retired top-3 authority and the offered-option gate.
 */

import { describe, expect, it } from "vitest";

import { REFINEMENT_TO_SIGNAL } from "@/components/studio-v3/adaptiveQuestions";
import { DISCOVERY_SIGNAL_TARGET } from "@/components/studio-v3/livingAtlasDecision";
import { INITIAL_STATE, type StudioV3State } from "@/components/studio-v3/types";
import { deriveDirectorAnswerProjection } from "@/lib/studio-v3/directorAnswerProjection";
import {
  buildExperienceProfile,
  buildStudioSemanticProfile,
} from "@/lib/studio-v3/livingAtlasBridge";
import {
  authoritativeSelectedOptionIds,
  hasQuestionSemanticProgress,
  isUncertaintyResolved,
  type QuestionAnswerEvent,
} from "@/lib/studio-v3/questionHistory";
import { projectSemanticProfile } from "@/lib/studio-v3/semanticProfileProjection";
import {
  appendLiveRefinementAnswer,
  hydrateLegacyRefinementHistory,
  hydrateStudioQuestionHistory,
  liveRefinementAnswerEvent,
  LEGACY_COMPATIBILITY_QUESTION_KEY,
  refinementQuestionKey,
} from "@/lib/studio-v3/studioQuestionHistoryBridge";

const WINE_OFFERED = ["wine-monumental-estates", "wine-clay-talha"] as const;

function draft(partial: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...partial };
}

describe("Pass 4 — canonical live question history", () => {
  it("a live answer is recorded exactly once", () => {
    const history = appendLiveRefinementAnswer([], "wine-clay-talha", WINE_OFFERED);
    expect(history).toHaveLength(1);
    expect(history[0].selectedOptionIds).toEqual(["wine-clay-talha"]);
    expect(history[0].offeredOptionIds).toEqual([...WINE_OFFERED]);
    expect(history[0].source).toBe("director");
    expect(deriveDirectorAnswerProjection(history).selectedDiscoverySignals).toEqual([
      "roman-talha-family",
    ]);
  });

  it("re-answering the same question replaces, never duplicates", () => {
    let history = appendLiveRefinementAnswer([], "wine-clay-talha", WINE_OFFERED);
    history = appendLiveRefinementAnswer(history, "wine-monumental-estates", WINE_OFFERED);
    expect(history).toHaveLength(1);
    expect(deriveDirectorAnswerProjection(history).selectedDiscoverySignals).toEqual([
      "monumental-alentejo",
    ]);
  });

  it("a different question family appends alongside, so N > 1 answers survive", () => {
    let history = appendLiveRefinementAnswer([], "wine-clay-talha", WINE_OFFERED);
    history = appendLiveRefinementAnswer(history, "coast-wild-beaches", [
      "coast-wild-beaches",
      "coast-from-the-water",
    ]);
    history = appendLiveRefinementAnswer(history, "hands-paint-tile", [
      "hands-paint-tile",
      "hands-just-watch",
    ]);
    history = appendLiveRefinementAnswer(history, "faith-templar-heritage", [
      "faith-templar-heritage",
      "faith-quiet-reflection",
    ]);
    // No artificial max-of-three question behaviour anywhere in the store.
    expect(history).toHaveLength(4);
    expect(deriveDirectorAnswerProjection(history).selectedDiscoverySignals).toHaveLength(4);
  });
});

describe("Pass 4 — backward hydration, exactly once", () => {
  it("a legacy refinement hydrates into exactly one compatibility event", () => {
    const history = hydrateLegacyRefinementHistory([], "wine-clay-talha");
    expect(history).toHaveLength(1);
    expect(history[0].source).toBe("legacy-refinement");
    // The historical question itself is unknown, so a generic compatibility
    // key is used rather than a reconstructed (invented) one.
    expect(history[0].questionKey).toBe(LEGACY_COMPATIBILITY_QUESTION_KEY);
    expect(history[0].legacyCompatibilityRefinementId).toBe("wine-clay-talha");
    // Nothing about the historical question is invented: the offered set is
    // unknown, so it stays empty rather than being fabricated from the answer.
    expect(history[0].offeredOptionIds).toEqual([]);
    expect(hasQuestionSemanticProgress(history[0])).toBe(true);
  });

  it("hydration is idempotent and never double-counts", () => {
    const once = hydrateLegacyRefinementHistory([], "wine-clay-talha");
    const twice = hydrateLegacyRefinementHistory(once, "wine-clay-talha");
    expect(twice).toHaveLength(1);
    expect(deriveDirectorAnswerProjection(twice).selectedDiscoverySignals).toEqual([
      "roman-talha-family",
    ]);
  });

  it("a canonical live answer suppresses legacy hydration of the same signal", () => {
    const live = appendLiveRefinementAnswer([], "hands-make-cheese", [
      "hands-make-cheese",
      "hands-just-watch",
    ]);
    // `wine-table-and-cheese` carries the SAME discovery signal through
    // another door — it must not be counted a second time.
    const hydrated = hydrateLegacyRefinementHistory(live, "wine-table-and-cheese");
    expect(hydrated).toHaveLength(1);
    expect(deriveDirectorAnswerProjection(hydrated).selectedDiscoverySignals).toEqual([
      "make-azeitao-cheese",
    ]);
  });

  it("saved drafts keep their semantic meaning and terminal direction", () => {
    const representative = [
      "wine-clay-talha",
      "coast-remote-southwest",
      "faith-templar-heritage",
      "photo-landmarks",
      "local-river-and-rice",
    ] as const;

    for (const refinement of representative) {
      const state = hydrateStudioQuestionHistory(draft({ refinement }));
      expect(state.questionHistory).toHaveLength(1);
      const projection = deriveDirectorAnswerProjection(state.questionHistory);
      const signal = REFINEMENT_TO_SIGNAL[refinement]!;
      expect(projection.selectedDiscoverySignals).toEqual([signal]);
      expect(projection.selectedDirectionIds).toEqual([DISCOVERY_SIGNAL_TARGET[signal]]);
    }
  });

  it("a state with no legacy refinement hydrates to an empty canonical store", () => {
    const state = hydrateStudioQuestionHistory(draft({ refinement: null }));
    expect(state.questionHistory).toEqual([]);
  });
});

describe("Pass 4 — offered-option gate", () => {
  const base: QuestionAnswerEvent = {
    ...liveRefinementAnswerEvent("wine-clay-talha", WINE_OFFERED),
  };

  it("a catalog-valid but UNOFFERED selection is non-authoritative", () => {
    const unoffered: QuestionAnswerEvent = {
      ...base,
      offeredOptionIds: ["wine-monumental-estates"],
      selectedOptionIds: ["wine-clay-talha"],
    };
    expect(authoritativeSelectedOptionIds(unoffered)).toEqual([]);
    expect(hasQuestionSemanticProgress(unoffered)).toBe(false);
    const projection = deriveDirectorAnswerProjection([unoffered]);
    expect(projection.selectedDiscoveryChoiceKeys).toEqual([]);
    expect(projection.selectedDiscoverySignals).toEqual([]);
    expect(projection.selectedDirectionIds).toEqual([]);
    // Fails closed: the uncertainty stays open rather than silently resolved.
    expect(
      isUncertaintyResolved([unoffered], unoffered.uncertaintyKey, unoffered.dependencyFingerprint),
    ).toBe(false);
  });

  it("an offered + catalog-valid selection projects normally", () => {
    expect(authoritativeSelectedOptionIds(base)).toEqual(["wine-clay-talha"]);
    expect(hasQuestionSemanticProgress(base)).toBe(true);
    expect(deriveDirectorAnswerProjection([base]).selectedDiscoverySignals).toEqual([
      "roman-talha-family",
    ]);
    expect(
      isUncertaintyResolved([base], base.uncertaintyKey, base.dependencyFingerprint),
    ).toBe(true);
  });

  it("only the offered part of a mixed selection is authoritative", () => {
    const mixed: QuestionAnswerEvent = {
      ...base,
      offeredOptionIds: ["coast-wild-beaches"],
      selectedOptionIds: ["wine-clay-talha", "coast-wild-beaches"],
    };
    expect(deriveDirectorAnswerProjection([mixed]).selectedDiscoverySignals).toEqual([
      "arrabida-beach-picnic",
    ]);
  });

  it("an unknown (uncatalogued) but offered id is still ignored", () => {
    const unknown: QuestionAnswerEvent = {
      ...base,
      offeredOptionIds: ["not-a-real-option"],
      selectedOptionIds: ["not-a-real-option"],
    };
    expect(deriveDirectorAnswerProjection([unknown]).selectedDiscoverySignals).toEqual([]);
  });
});

describe("Pass 4 — retired top-3 product authority", () => {
  const interests = [
    "wine",
    "coast",
    "heritage",
    "faith",
    "local-life",
    "hands-on",
  ] as const;

  it("six explicit interests survive the live semantic profile without truncation", () => {
    const profile = buildStudioSemanticProfile({ feeling: "coastal", interests: [...interests] });
    const keys = profile.contentInterests.map((signal) => signal.key);
    for (const interest of interests) {
      expect(keys).toContain(`interest:${interest}`);
    }
    expect(profile.contentInterests.length).toBeGreaterThanOrEqual(interests.length);
  });

  it("the ExperienceProfile truncation is compatibility-only and reports what it deferred", () => {
    const profile = buildStudioSemanticProfile({ feeling: "coastal", interests: [...interests] });
    const projection = projectSemanticProfile(profile);
    // Legacy contract shape is preserved for old consumers...
    expect(projection.legacyCompatibilityProjection?.selected.length).toBeLessThanOrEqual(3);
    expect(buildExperienceProfile({ feeling: "coastal", interests: [...interests] })).toEqual(
      projection.legacyCompatibilityProjection,
    );
    // ...but nothing is silently dropped.
    expect(projection.deferred.length).toBeGreaterThan(0);
  });
});

describe("Pass 4 — dependency-specific invalidation", () => {
  it("unrelated history survives when one question's dependencies change", () => {
    let history = appendLiveRefinementAnswer([], "coast-wild-beaches", [
      "coast-wild-beaches",
      "coast-from-the-water",
    ]);
    history = appendLiveRefinementAnswer(history, "wine-clay-talha", WINE_OFFERED);

    const coast = history[0];
    const wine = history[1];
    expect(coast.dependencyFingerprint).not.toBe(wine.dependencyFingerprint);

    // The wine question's offered set changes → only ITS fingerprint changes.
    const changedWine = liveRefinementAnswerEvent("wine-clay-talha", [
      ...WINE_OFFERED,
      "wine-cellar-depth",
    ]);
    expect(changedWine.dependencyFingerprint).not.toBe(wine.dependencyFingerprint);
    expect(
      isUncertaintyResolved(history, wine.uncertaintyKey, changedWine.dependencyFingerprint),
    ).toBe(false);
    // The unrelated coast answer is untouched and still resolved.
    expect(
      isUncertaintyResolved(history, coast.uncertaintyKey, coast.dependencyFingerprint),
    ).toBe(true);
  });

  it("an already-resolved question is not re-asked without semantic progress", () => {
    const history = appendLiveRefinementAnswer([], "wine-clay-talha", WINE_OFFERED);
    const event = history[0];
    expect(
      isUncertaintyResolved(history, event.uncertaintyKey, event.dependencyFingerprint),
    ).toBe(true);
    // A pure skip of the same question adds no progress and cannot "unresolve" it.
    const skipped: QuestionAnswerEvent = { ...event, selectedOptionIds: [] };
    expect(hasQuestionSemanticProgress(skipped)).toBe(false);
  });
});
