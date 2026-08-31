import { describe, expect, it } from "vitest";
import {
  SIGNATURE_SOURCE_OF_TRUTH,
  type SignatureSourceOfTruth,
} from "@/data/signatureToursSourceOfTruth";
import {
  adminSeedToSourceOfTruth,
  allCanonicalAdminSeeds,
  sourceOfTruthToAdminSeed,
} from "@/lib/admin-signature-content-adapter";

const canonical = Object.values(SIGNATURE_SOURCE_OF_TRUTH).filter(
  (source): source is SignatureSourceOfTruth => Boolean(source),
);

describe("Admin vNext Signature content migration adapter", () => {
  it("covers every current canonical Signature", () => {
    const seeds = allCanonicalAdminSeeds();
    expect(seeds).toHaveLength(canonical.length);
    expect(new Set(seeds.map((seed) => seed.content.tourId)).size).toBe(canonical.length);
  });

  it.each(canonical.map((source) => [source.tourId, source] as const))(
    "%s round-trips without semantic drift",
    (_tourId, source) => {
      const seed = sourceOfTruthToAdminSeed(source);
      const restored = adminSeedToSourceOfTruth(seed);
      expect(restored).toEqual(source);
    },
  );

  it("keeps itinerary classification and pool identity intact", () => {
    const source = SIGNATURE_SOURCE_OF_TRUTH["arrabida-wine-allinclusive"]!;
    const seed = sourceOfTruthToAdminSeed(source);
    const wineryPool = seed.itinerary.filter(
      (chapter) => chapter.stopType === "alternative-pool" && chapter.poolId === "wineries",
    );

    expect(wineryPool.length).toBeGreaterThan(1);
    expect(seed.content.poolPick?.wineries).toEqual(source.poolPick?.wineries);
    expect(wineryPool.map((chapter) => chapter.label)).toEqual(
      source.itinerary
        .filter((chapter) => chapter.stopType === "alternative-pool" && chapter.poolId === "wineries")
        .map((chapter) => chapter.label),
    );
  });

  it("does not mutate the current Source of Truth while producing editable seed data", () => {
    const source = SIGNATURE_SOURCE_OF_TRUTH["troia-comporta"]!;
    const before = JSON.stringify(source);
    const seed = sourceOfTruthToAdminSeed(source);

    const mutableHighlights = seed.content.highlights as string[];
    mutableHighlights.push("temporary test-only change");
    const mutableItinerary = seed.itinerary as unknown as Array<{ label: string }>;
    mutableItinerary[0]!.label = "temporary test-only stop";

    expect(JSON.stringify(source)).toBe(before);
  });
});
