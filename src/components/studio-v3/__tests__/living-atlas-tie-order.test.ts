/**
 * BUILD 0 — array order must never be a silent winner.
 *
 * A materially tied top is an unresolved question. Catalogue declaration order
 * is allowed to make reporting stable, never to pick a commercial direction.
 */

import { describe, expect, it } from "vitest";
import {
  decideLivingAtlasSignature,
  LIVING_ATLAS_TIE_EPSILON,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  type ExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";

describe("tie behaviour", () => {
  it("returns a precision fork instead of picking the earliest declared direction", () => {
    const profile: ExperienceProfile = {
      selected: ["history-heritage"],
      leads: ["history-heritage"],
    };
    const decision = decideLivingAtlasSignature({ profile });

    expect(decision.status).toBe("precision-fork");
    expect(decision.selectedSignatureId).toBeNull();
    expect(decision.ambiguity.tiedSignatureIds.length).toBeGreaterThan(1);
    // Generic heritage must NOT silently resolve Sintra.
    expect(decision.forkCandidates.length).toBeGreaterThan(1);
  });

  it("reports every near-tied candidate inside the epsilon window", () => {
    const profile: ExperienceProfile = {
      selected: ["history-heritage"],
      leads: ["history-heritage"],
    };
    const decision = decideLivingAtlasSignature({ profile });
    const top = decision.ranked[0].totalScore;
    for (const id of decision.ambiguity.tiedSignatureIds) {
      const candidate = decision.ranked.find((item) => item.signatureId === id)!;
      expect(top - candidate.totalScore).toBeLessThanOrEqual(LIVING_ATLAS_TIE_EPSILON);
    }
    expect(decision.ambiguity.epsilon).toBe(LIVING_ATLAS_TIE_EPSILON);
  });

  it("orders equal scores alphabetically, not by catalogue array position", () => {
    const profile: ExperienceProfile = {
      selected: ["history-heritage"],
      leads: ["history-heritage"],
    };
    const ranked = decideLivingAtlasSignature({ profile }).ranked;

    for (let i = 1; i < ranked.length; i += 1) {
      if (ranked[i].totalScore !== ranked[i - 1].totalScore) continue;
      expect(ranked[i - 1].signatureId.localeCompare(ranked[i].signatureId)).toBeLessThan(0);
    }

    // Prove the display order is not the catalogue order.
    const catalogueOrder = LIVING_ATLAS_SIGNATURE_IDS.filter((id) =>
      ranked.some((candidate) => candidate.signatureId === id),
    );
    expect(ranked.map((candidate) => candidate.signatureId)).not.toEqual(catalogueOrder);
  });

  it("resolves a tie only with an explicit discovery signal", () => {
    const profile: ExperienceProfile = {
      selected: ["history-heritage"],
      leads: ["history-heritage"],
    };
    const resolved = decideLivingAtlasSignature({
      profile,
      discoverySignal: "palaces-and-atlantic",
    });
    expect(resolved.status).toBe("clear");
    expect(resolved.selectedSignatureId).toBe("sintra-cascais");
    expect(resolved.ambiguity.resolvedBy).toBe("score-margin");
  });

  it("resolves a tie with an explicit single-product destination", () => {
    const profile: ExperienceProfile = {
      selected: ["history-heritage"],
      leads: ["history-heritage"],
    };
    const resolved = decideLivingAtlasSignature({
      profile,
      destinationIntent: "lisbon-sintra-cascais",
    });
    expect(resolved.status).toBe("clear");
    expect(resolved.selectedSignatureId).toBe("sintra-cascais");
  });

  it("keeps a clear winner clear when the margin is real", () => {
    const profile: ExperienceProfile = {
      selected: ["faith-reflection"],
      leads: ["faith-reflection"],
    };
    const decision = decideLivingAtlasSignature({ profile });
    expect(decision.status).toBe("clear");
    expect(decision.selectedSignatureId).toBe("fatima-nazare-obidos");
    expect(decision.ambiguity.resolvedBy).toBe("score-margin");
  });
});
