import { describe, expect, it } from "vitest";
import { curateJourney, semanticStopKey } from "@/components/studio-v3/curation";

const WINE_RE = /winery|wineries|wine|vinho|adega|cellar|tasting|vineyard/i;

function wineryMoments(journey: ReturnType<typeof curateJourney>): string[] {
  return journey.moments
    .filter((m) => WINE_RE.test(`${m.label} ${m.story ?? ""}`))
    .map((m) => m.label);
}

describe("wine is contextual, never forced by a region choice", () => {
  it("does not force a winery into a coastal day in Arrábida with no wine interest", () => {
    const journey = curateJourney("coastal", "couple", "full", {
      interests: ["coast", "nature"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    // The resolved Signature may legitimately contain a cellar of its own,
    // but curation must never *swap a stop out* to insert one.
    expect(journey.audit.rejections.some((r) => r.reason === "swapped-for-wine")).toBe(false);
  });

  it("still honours wine when the traveller actually asked for it", () => {
    const journey = curateJourney("wine-food", "couple", "full", {
      interests: ["wine"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    expect(wineryMoments(journey).length).toBeGreaterThan(0);
  });

  it("keeps the Alentejo wine intents as an explicit wine signal", () => {
    const journey = curateJourney("culture", "couple", "full", {
      interests: ["heritage"],
      destinationIntent: "alentejo-evora-wine",
    });
    expect(wineryMoments(journey).length).toBeGreaterThan(0);
  });
});

describe("place identity dedupe", () => {
  it("collapses two catalog names for the same winery onto one key", () => {
    expect(semanticStopKey("Farm Catralvos")).toBe(semanticStopKey("Quinta de Catralvos"));
    expect(semanticStopKey("Bacalhôa Vinhos de Portugal")).toBe(
      semanticStopKey("Quinta da Bacalhoa"),
    );
  });

  it("keeps genuinely different places apart", () => {
    expect(semanticStopKey("Adega Regional de Colares")).not.toBe(
      semanticStopKey("Adega Cooperativa de Palmela"),
    );
    expect(semanticStopKey("Quinta do Piloto")).not.toBe(semanticStopKey("Quinta de Catralvos"));
  });
});
