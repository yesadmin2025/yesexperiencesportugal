import { describe, expect, it } from "vitest";
import {
  isAdaptiveQuestionRelevant,
  refinementSummaryLabel,
  refinementToDiscoverySignal,
  resolveAdaptiveQuestion,
} from "@/components/studio-v3/adaptiveQuestions";
import {
  decideLivingAtlasSignature,
  LIVING_ATLAS_DISCOVERY_SIGNAL_IDS,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  SIGNATURE_DIMENSION_AFFINITY,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { signatureTours } from "@/data/signatureTours";
import {
  INITIAL_STATE,
  type DestinationIntent,
  type StudioV3State,
} from "@/components/studio-v3/types";

function stateWith(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

const DESTINATION_INTENTS: Record<DestinationIntent, true> = {
  "no-preference": true,
  "lisbon-sintra-cascais": true,
  "arrabida-setubal-azeitao": true,
  "alentejo-evora-wine": true,
  "alentejo-roman-talha": true,
  "vicentine-coast": true,
  "comporta-troia": true,
  "spiritual-coast": true,
  "central-portugal": true,
  "anywhere-special": true,
};

describe("adaptive refinement question", () => {
  it("is skipped when the traveller has said nothing to refine", () => {
    expect(resolveAdaptiveQuestion(INITIAL_STATE)).toBeNull();
    expect(isAdaptiveQuestionRelevant(INITIAL_STATE)).toBe(false);
  });

  it("asks about the coast only where the answer can distinguish supported routes", () => {
    const arrabida = stateWith({
      feeling: "coastal",
      destinationIntent: "arrabida-setubal-azeitao",
    });
    expect(resolveAdaptiveQuestion(arrabida)?.kind).toBe("coast");

    const fixedComporta = stateWith({
      feeling: "coastal",
      destinationIntent: "comporta-troia",
    });
    const inland = stateWith({
      feeling: "coastal",
      destinationIntent: "alentejo-evora-wine",
    });
    expect(resolveAdaptiveQuestion(fixedComporta)?.kind).not.toBe("coast");
    expect(resolveAdaptiveQuestion(inland)?.kind).not.toBe("coast");
  });

  it("asks about wine only where the answer can change the supported direction", () => {
    const openWine = stateWith({
      feeling: "wine-food",
      interests: ["wine"],
      destinationIntent: "no-preference",
    });
    const arrabidaWine = stateWith({
      feeling: "wine-food",
      interests: ["wine"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    const fixedAlentejo = stateWith({
      feeling: "wine-food",
      interests: ["wine"],
      destinationIntent: "alentejo-evora-wine",
    });

    expect(resolveAdaptiveQuestion(openWine)?.kind).toBe("wine");
    expect(resolveAdaptiveQuestion(arrabidaWine)?.kind).toBe("wine");
    expect(resolveAdaptiveQuestion(fixedAlentejo)?.kind).not.toBe("wine");
  });

  it("offers hands-on only where supported workshops can fit the route", () => {
    const arrabida = stateWith({
      feeling: "culture",
      interests: ["local-life"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    expect(resolveAdaptiveQuestion(arrabida)?.kind).toBe("hands");

    const evora = stateWith({
      feeling: "culture",
      interests: ["heritage"],
      destinationIntent: "alentejo-evora-wine",
    });
    expect(resolveAdaptiveQuestion(evora)?.kind).not.toBe("hands");
  });

  it("keeps local-life options inside the selected region", () => {
    const comporta = stateWith({
      feeling: "hidden",
      destinationIntent: "comporta-troia",
    });
    const arrabida = stateWith({
      feeling: "hidden",
      destinationIntent: "arrabida-setubal-azeitao",
    });
    const evora = stateWith({
      feeling: "hidden",
      destinationIntent: "alentejo-evora-wine",
    });

    const comportaIds = (resolveAdaptiveQuestion(comporta)?.options ?? []).map(
      (option) => option.id,
    );
    const arrabidaIds = (resolveAdaptiveQuestion(arrabida)?.options ?? []).map(
      (option) => option.id,
    );

    expect(comportaIds).toContain("local-river-and-rice");
    expect(comportaIds).not.toContain("local-artisans");
    expect(arrabidaIds).toContain("local-artisans");
    expect(arrabidaIds).not.toContain("local-river-and-rice");
    expect(resolveAdaptiveQuestion(evora)).toBeNull();
  });

  it("asks at most one question rather than building another form", () => {
    const busy = stateWith({
      feeling: "coastal",
      interests: ["wine", "local-life", "heritage", "coast"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    const question = resolveAdaptiveQuestion(busy);
    expect(question).not.toBeNull();
    expect(question?.kind).toBe("coast");
    expect(question?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("maps every displayed answer to a real discovery signal or to nothing", () => {
    const known = new Set<string>(LIVING_ATLAS_DISCOVERY_SIGNAL_IDS);
    const states: StudioV3State[] = [
      stateWith({ feeling: "coastal", destinationIntent: "arrabida-setubal-azeitao" }),
      stateWith({ feeling: "wine-food", destinationIntent: "no-preference" }),
      stateWith({
        feeling: "culture",
        interests: ["local-life"],
        destinationIntent: "arrabida-setubal-azeitao",
      }),
      stateWith({ feeling: "hidden", destinationIntent: "comporta-troia" }),
    ];

    for (const state of states) {
      for (const option of resolveAdaptiveQuestion(state)?.options ?? []) {
        const signal = refinementToDiscoverySignal(option.id);
        if (signal !== null) expect(known.has(signal)).toBe(true);
        expect(refinementSummaryLabel(option.id)).toBeTruthy();
      }
    }
  });
});

describe("catalogue and destination coverage", () => {
  it("keeps the intelligence catalogue exactly aligned with the Signature SSOT", () => {
    const intelligenceIds = [...LIVING_ATLAS_SIGNATURE_IDS].sort();
    const catalogueIds = signatureTours.map((tour) => tour.id).sort();
    expect(intelligenceIds).toEqual(catalogueIds);
  });

  it("scores every Signature across the complete dimension affinity table", () => {
    for (const id of LIVING_ATLAS_SIGNATURE_IDS) {
      expect(SIGNATURE_DIMENSION_AFFINITY[id]).toBeDefined();
    }
  });

  it("returns candidates for every supported destination intent", () => {
    for (const destinationIntent of Object.keys(DESTINATION_INTENTS) as DestinationIntent[]) {
      const decision = decideLivingAtlasSignature({
        profile: {
          selected: ["history-heritage"],
          leads: ["history-heritage"],
        },
        destinationIntent,
      });
      expect(decision.ranked.length).toBeGreaterThan(0);
    }
  });
});
