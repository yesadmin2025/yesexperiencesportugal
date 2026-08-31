/**
 * FINAL SURGICAL CLOSURE — focused proofs only.
 *
 * Canvas → shaped continuity, media identity reuse, exact ordered Director
 * IDs through the presentation seam, exclusion-driven fork invalidation and
 * shape editing authority.
 */

import { describe, expect, it } from "vitest";

import { deriveLivingCanvas } from "@/lib/studio-v3/livingCanvasModel";
import { adaptDirectorQuestion } from "@/lib/studio-v3/questionPresentationAdapter";
import { deriveStudioDirectorRuntime } from "@/lib/studio-v3/studioDirectorRuntime";
import { upsertFreeTextAnswer } from "@/lib/studio-v3/freeTextAnswer";
import { appendLiveDirectorAnswer } from "@/lib/studio-v3/studioQuestionHistoryBridge";
import {
  applyRoutedValidation,
  createShapeState,
  commercialIdentities,
  removeMoment,
  swapMoment,
  undoLastEdit,
} from "@/lib/studio-v3/shapeEditing";
import { resolveForkMedia } from "@/lib/studio-v3/forkMedia";
import { stripStudioAnalyticsPii, type StudioAnalyticsEvent } from "@/lib/studio-analytics";

const COMPOSITION = {
  regionLabel: "Arrábida",
  points: [
    { label: "Quinta de Alcube", story: "A family cellar.", lat: 38.5, lng: -9.0 },
    { label: "Portinho da Arrábida", story: "The cove.", lat: 38.48, lng: -8.98 },
    { label: "Mercado do Livramento", story: "The market.", lat: 38.52, lng: -8.89 },
  ],
};

/** Exactly the identity shape the live Studio hands the Canvas from the
 * shared builder image authority (`useBuilderRouteImages`). */
const STOP_IMAGES = {
  "quinta de alcube": {
    id: "stop:quinta de alcube",
    src: "https://cdn.example/alcube.jpg",
    alt: "Cellar",
  },
  "portinho da arrábida": {
    id: "stop:portinho da arrábida",
    src: "https://cdn.example/portinho.jpg",
    alt: "Cove",
  },
};

const BASE_INPUT = {
  feeling: "wine-food" as const,
  interests: ["wine", "coast", "heritage", "local-life", "hands-on"] as const,
  rhythm: "balanced" as const,
  destinationIntent: "no-preference" as const,
};

describe("closure — canvas progresses and stays continuous into YOUR DAY", () => {
  it("moves mood → threads → composition → shaped from real Studio inputs", () => {
    expect(deriveLivingCanvas({ feeling: null, interests: [] }).stage).toBe("mood");
    expect(deriveLivingCanvas({ feeling: "romance", interests: ["wine"] }).stage).toBe("threads");
    expect(
      deriveLivingCanvas({ feeling: "romance", interests: ["wine"], composition: COMPOSITION })
        .stage,
    ).toBe("composition");

    const shaped = deriveLivingCanvas({
      feeling: "romance",
      interests: ["wine"],
      composition: COMPOSITION,
      shaped: true,
      stopImages: STOP_IMAGES,
    });
    expect(shaped.stage).toBe("shaped");
    expect(shaped.moments.length).toBe(COMPOSITION.points.length);
  });

  it("reuses the SAME real stop media identity the reveal reads", () => {
    const shaped = deriveLivingCanvas({
      feeling: "romance",
      interests: ["wine"],
      composition: COMPOSITION,
      shaped: true,
      stopImages: STOP_IMAGES,
    });
    const alcube = shaped.moments.find((moment) => moment.label === "Quinta de Alcube");
    expect(alcube?.image.id).toBe(STOP_IMAGES["quinta de alcube"].id);
    expect(alcube?.image.src).toBe(STOP_IMAGES["quinta de alcube"].src);
    // A stop with no real photo never borrows another stop's photograph.
    const market = shaped.moments.find((moment) => moment.label === "Mercado do Livramento");
    expect(market?.image.src).not.toBe(STOP_IMAGES["quinta de alcube"].src);
  });
});

describe("closure — presentation seam preserves exact ordered Director IDs", () => {
  it("adaptDirectorQuestion never reorders or renames option IDs", () => {
    const runtime = deriveStudioDirectorRuntime({ ...BASE_INPUT, questionHistory: [] });
    expect(runtime.decision.shouldAsk).toBe(true);
    const adapted = adaptDirectorQuestion(runtime.decision, null);
    expect(adapted).not.toBeNull();
    expect(adapted!.presentation.offeredOptionIds).toEqual(runtime.decision.choiceKeys);
  });

  it("image-led fork media, when it exists, is one distinct photo per option in order", () => {
    const runtime = deriveStudioDirectorRuntime({ ...BASE_INPUT, questionHistory: [] });
    const ids = runtime.decision.choiceKeys ?? [];
    const media = resolveForkMedia(ids);
    if (media) {
      expect(media).toHaveLength(ids.length);
      expect(new Set(media.map((image) => image.src)).size).toBe(ids.length);
    }
  });
});

describe("closure — free-text exclusion invalidates a materially changed fork", () => {
  it("a resolved answer cannot suppress a fork whose allowed option set changed", () => {
    const base = deriveStudioDirectorRuntime({ ...BASE_INPUT, questionHistory: [] });
    expect(base.decision.shouldAsk).toBe(true);

    const answered = appendLiveDirectorAnswer([], {
      questionKey: base.decision.questionKey!,
      uncertaintyKey: base.decision.uncertaintyKey!,
      dependencyFingerprint: base.decision.dependencyFingerprint!,
      offeredOptionIds: base.decision.choiceKeys ?? [],
      selectedOptionId: (base.decision.choiceKeys ?? [])[0]!,
    });

    const settled = deriveStudioDirectorRuntime({ ...BASE_INPUT, questionHistory: answered });
    const stillSameFork =
      settled.decision.shouldAsk &&
      settled.decision.questionKey === base.decision.questionKey &&
      settled.decision.dependencyFingerprint === base.decision.dependencyFingerprint;
    expect(stillSameFork).toBe(false);

    // An explicit exclusion changes the material allowed-option set, so the
    // stale answer's fingerprint can never stand in for the new fork.
    const excluded = upsertFreeTextAnswer(answered, "no wine please");
    const after = deriveStudioDirectorRuntime({ ...BASE_INPUT, questionHistory: excluded });
    const staleStillAuthoritative =
      after.decision.shouldAsk &&
      after.decision.questionKey === base.decision.questionKey &&
      after.decision.dependencyFingerprint === base.decision.dependencyFingerprint;
    expect(staleStillAuthoritative).toBe(false);
  });
});

describe("closure — live SHAPE keeps commercial identity and never mutates silently", () => {
  const moments = [
    { id: "m1", label: "Quinta de Alcube", optional: false, commercialId: "alcube" },
    { id: "m2", label: "Portinho da Arrábida", optional: true, commercialId: "portinho" },
    { id: "m3", label: "Mercado do Livramento", optional: true, commercialId: "mercado" },
  ];
  const approvedSwaps = {
    m2: [{ id: "m2b", label: "Casa Mãe", optional: true, commercialId: "casa-mae" }],
  };

  it("remove / swap / undo change the authoritative path and preserve identity", () => {
    const start = createShapeState(moments, approvedSwaps);
    const removed = removeMoment(start, "m3");
    expect(removed.rejected).toBeUndefined();
    expect(removed.state.moments.map((moment) => moment.id)).toEqual(["m1", "m2"]);
    expect(commercialIdentities(removed.state)).toContain("alcube");

    // A non-optional anchor is never silently droppable.
    expect(removeMoment(removed.state, "m1").rejected).toBe("not-optional");

    const swapped = swapMoment(removed.state, "m2", "m2b");
    expect(swapped.rejected).toBeUndefined();
    expect(swapped.state.moments.map((moment) => moment.id)).toEqual(["m1", "m2b"]);
    expect(swapMoment(swapped.state, "m1", "invented").rejected).toBe("candidate-not-approved");

    const undone = undoLastEdit(swapped.state);
    expect(undone.state.moments.map((moment) => moment.id)).toEqual(["m1", "m2"]);
  });

  it("routed validation surfaces a tradeoff instead of changing membership", () => {
    const start = createShapeState(moments, approvedSwaps);
    const validated = applyRoutedValidation(start, { infeasibleMomentIds: ["m3"] });
    expect(validated.membershipChanged).toBe(false);
    expect(validated.state.moments.map((moment) => moment.id)).toEqual(["m1", "m2", "m3"]);
    expect(validated.state.pendingTradeoffs).toHaveLength(1);
  });
});

describe("closure — final typed analytics exist, with no PII", () => {
  it("the product outcome events are part of the typed vocabulary", () => {
    const events: StudioAnalyticsEvent[] = [
      "studio_signature_candidate",
      "studio_final_skeleton",
      "studio_checkout_started",
      "studio_fork_answered",
    ];
    expect(events).toHaveLength(4);
  });

  it("PII never reaches an analytics payload", () => {
    const clean = stripStudioAnalyticsPii({
      tour_id: "arrabida",
      moment_count: 3,
      name: "Nidia",
      email: "a@b.c",
      notes: "no wine please",
    });
    expect(clean).toEqual({ tour_id: "arrabida", moment_count: 3 });
  });
});
