import { describe, expect, it } from "vitest";

import {
  buildExperienceProfile,
  deriveStudioIntelligence,
} from "@/lib/studio-v3/livingAtlasBridge";
import { signatureTours } from "@/data/signatureTours";

describe("livingAtlasBridge", () => {
  it("returns no profile when the traveller has answered nothing", () => {
    expect(buildExperienceProfile({ feeling: null, interests: [] })).toBeNull();
    const intelligence = deriveStudioIntelligence({ feeling: null, interests: [] });
    expect(intelligence.preferredTourId).toBeNull();
    expect(intelligence.reasons).toEqual([]);
  });

  it("makes the feeling lead the day and folds interests in as support", () => {
    const profile = buildExperienceProfile({
      feeling: "wine-food",
      interests: ["coast", "heritage", "wine"],
    });
    expect(profile).not.toBeNull();
    expect(profile?.leads).toEqual(["wine-table"]);
    expect(profile?.selected[0]).toBe("wine-table");
    expect(profile?.selected.length).toBeLessThanOrEqual(3);
  });

  it("never prefers a Signature that does not exist in the catalogue", () => {
    const ids = new Set(signatureTours.map((tour) => tour.id));
    const intelligence = deriveStudioIntelligence({
      feeling: "coastal",
      interests: ["coast", "nature"],
      destinationIntent: "arrabida-setubal-azeitao",
    });
    if (intelligence.preferredTourId) {
      expect(ids.has(intelligence.preferredTourId)).toBe(true);
    }
  });

  it("explains the direction with grounded, non-empty reasons", () => {
    const intelligence = deriveStudioIntelligence({
      feeling: "wine-food",
      interests: ["wine", "gastronomy"],
      destinationIntent: "alentejo-evora-wine",
      rhythm: "slow",
    });
    expect(intelligence.reasons.length).toBeGreaterThan(0);
    expect(intelligence.reasons.length).toBeLessThanOrEqual(3);
    for (const reason of intelligence.reasons) {
      expect(reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for identical answers", () => {
    const input = {
      feeling: "culture",
      interests: ["heritage", "local-life"],
    } as const;
    expect(deriveStudioIntelligence({ ...input })).toEqual(deriveStudioIntelligence({ ...input }));
  });
});
