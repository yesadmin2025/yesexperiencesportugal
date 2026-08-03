import { describe, expect, it } from "vitest";
import {
  isAdaptiveQuestionRelevant,
  refinementSummaryLabel,
  refinementToDiscoverySignal,
  resolveAdaptiveQuestion,
} from "@/components/studio-v3/adaptiveQuestions";
import { LIVING_ATLAS_DISCOVERY_SIGNAL_IDS } from "@/components/studio-v3/livingAtlasDecision";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  SIGNATURE_DIMENSION_AFFINITY,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { signatureTours } from "@/data/signatureTours";
import { INITIAL_STATE, type StudioV3State } from "@/components/studio-v3/types";

function stateWith(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

describe("adaptive refinement question", () => {
  it("is skipped when the traveller has said nothing to refine", () => {
    expect(resolveAdaptiveQuestion(INITIAL_STATE)).toBeNull();
    expect(isAdaptiveQuestionRelevant(INITIAL_STATE)).toBe(false);
  });

  it("asks about the coast only when the destination can reach the Atlantic", () => {
    const coastal = stateWith({ feeling: "coastal", destinationIntent: "comporta-troia" });
    expect(resolveAdaptiveQuestion(coastal)?.kind).toBe("coast");

    const inland = stateWith({ feeling: "coastal", destinationIntent: "alentejo-evora-wine" });
    expect(resolveAdaptiveQuestion(inland)?.kind).not.toBe("coast");
  });

  it("asks about wine when wine or the table leads", () => {
    const wine = stateWith({ feeling: "wine-food", interests: ["wine"] });
    expect(resolveAdaptiveQuestion(wine)?.kind).toBe("wine");
  });

  it("offers hands-on only where a real workshop exists in the catalogue", () => {
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

  it("only offers rice fields where rice fields are on the route", () => {
    const comporta = stateWith({ feeling: "hidden", destinationIntent: "comporta-troia" });
    const evora = stateWith({ feeling: "hidden", destinationIntent: "alentejo-evora-wine" });
    const comportaIds = (resolveAdaptiveQuestion(comporta)?.options ?? []).map((o) => o.id);
    const evoraIds = (resolveAdaptiveQuestion(evora)?.options ?? []).map((o) => o.id);
    if (comportaIds.length) expect(comportaIds).toContain("local-river-and-rice");
    expect(evoraIds).not.toContain("local-river-and-rice");
  });

  it("asks at most one question, never a form", () => {
    const busy = stateWith({
      feeling: "coastal",
      interests: ["wine", "local-life", "heritage", "coast"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    const question = resolveAdaptiveQuestion(busy);
    expect(question).not.toBeNull();
    expect(question?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("maps every answer to a real discovery signal or to nothing", () => {
    const known = new Set<string>(LIVING_ATLAS_DISCOVERY_SIGNAL_IDS);
    const states: StudioV3State[] = [
      stateWith({ feeling: "coastal", destinationIntent: "arrabida-setubal-azeitao" }),
      stateWith({ feeling: "wine-food" }),
      stateWith({ feeling: "culture", interests: ["local-life"] }),
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

describe("catalogue coverage", () => {
  it("scores every Living Atlas signature across all dimensions", () => {
    for (const id of LIVING_ATLAS_SIGNATURE_IDS) {
      expect(SIGNATURE_DIMENSION_AFFINITY[id]).toBeDefined();
    }
  });

  it("only references Signature ids that exist in the real catalogue", () => {
    const catalogue = new Set(signatureTours.map((t) => t.id));
    for (const id of LIVING_ATLAS_SIGNATURE_IDS) {
      expect(catalogue.has(id)).toBe(true);
    }
  });
});
