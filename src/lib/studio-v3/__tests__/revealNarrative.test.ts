import { describe, expect, it } from "vitest";

import { buildRevealNarrative } from "@/lib/studio-v3/revealNarrative";
import { deriveStudioIntelligence } from "@/lib/studio-v3/livingAtlasBridge";
import { EXPERIENCE_DIMENSIONS } from "@/components/studio-v3/livingAtlasTaxonomy";

describe("buildRevealNarrative", () => {
  it("keeps the opener grounded in the resolved region and never invents facts", () => {
    const narrative = buildRevealNarrative({
      feeling: "wine-food",
      interests: [],
      rhythm: null,
      destinationIntent: null,
      refinement: null,
      region: "Arrábida",
    });

    expect(narrative.intro).toContain("Arrábida");
    expect(narrative.signals.length).toBeLessThanOrEqual(3);
  });

  it("reflects more than one answer with grounded signals from the intelligence bridge", () => {
    const input = {
      feeling: "wine-food",
      interests: ["wine", "nature"],
      rhythm: "slow",
      destinationIntent: null,
      refinement: null,
      region: "Arrábida",
    } as const;

    const intelligence = deriveStudioIntelligence({
      feeling: input.feeling,
      interests: [...input.interests],
      destinationIntent: input.destinationIntent,
      rhythm: input.rhythm,
      refinement: input.refinement,
    });

    const narrative = buildRevealNarrative({ ...input, interests: [...input.interests] });

    // Signals are the bridge's own grounded reasons — no second reasoning system.
    for (const reason of intelligence.reasons.slice(0, 3)) {
      expect(narrative.signals.some((s) => reason.startsWith(s))).toBe(true);
    }

    expect(narrative.signals.length).toBeGreaterThanOrEqual(2);
    // Deterministic: same answers in, same sentences out.
    expect(buildRevealNarrative({ ...input, interests: [...input.interests] })).toEqual(narrative);
  });

  it("never repeats the same idea twice", () => {
    const narrative = buildRevealNarrative({
      feeling: "slow-luxury",
      interests: ["wine"],
      rhythm: "slow",
      destinationIntent: null,
      refinement: null,
      region: "Alentejo",
    });
    const unique = new Set(narrative.signals.map((s) => s.toLowerCase()));
    expect(unique.size).toBe(narrative.signals.length);
  });

  it("is byte-identical across repeated runs for the same multi-answer input", () => {
    const input = {
      feeling: "wine-food",
      interests: ["wine", "heritage", "nature"],
      rhythm: "balanced",
      destinationIntent: "alentejo-evora-wine",
      refinement: null,
      region: "Alentejo",
      addOnLabels: ["Private picnic"],
    } as const;

    const runs = Array.from({ length: 5 }, () =>
      buildRevealNarrative({
        ...input,
        interests: [...input.interests],
        addOnLabels: [...input.addOnLabels],
      }),
    );

    const first = JSON.stringify(runs[0]);
    for (const run of runs) {
      expect(JSON.stringify(run)).toBe(first);
    }
  });

  it("never surfaces the same experience dimension in more than one signal", () => {
    const cases = [
      {
        feeling: "wine-food",
        interests: ["wine", "gastronomy", "heritage"],
        rhythm: "slow",
        destinationIntent: "alentejo-evora-wine",
        refinement: null,
        region: "Alentejo",
      },
      {
        feeling: "coastal",
        interests: ["coast", "nature", "local-life"],
        rhythm: "full",
        destinationIntent: null,
        refinement: null,
        region: "Arrábida",
      },
      {
        feeling: "culture",
        interests: ["heritage", "local-life"],
        rhythm: "immersive",
        destinationIntent: null,
        refinement: null,
        region: "Sintra",
      },
    ] as const;

    for (const testCase of cases) {
      const narrative = buildRevealNarrative({
        ...testCase,
        interests: [...testCase.interests],
      });

      for (const dimension of EXPERIENCE_DIMENSIONS) {
        const needle = dimension.label.toLowerCase();
        const hits = narrative.signals.filter((signal) => signal.toLowerCase().includes(needle));
        expect(hits.length, `${dimension.id} repeated in: ${hits.join(" / ")}`).toBeLessThanOrEqual(
          1,
        );
      }
    }
  });
});
