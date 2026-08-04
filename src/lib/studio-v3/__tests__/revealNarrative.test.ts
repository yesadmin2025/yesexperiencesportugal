import { describe, expect, it } from "vitest";

import { buildRevealNarrative } from "@/lib/studio-v3/revealNarrative";
import { deriveStudioIntelligence } from "@/lib/studio-v3/livingAtlasBridge";

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
});
