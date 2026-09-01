import { describe, expect, it } from "vitest";

import { resolveStudioV3Route, resolveLivingAtlasCompositionResolution } from "../curation";
import { isSelfServiceComposable } from "@/lib/studio-v3/selfServiceResolution";

const base = {
  moments: [1, 2, 3],
  missingRequiredTypes: [] as unknown[],
  conflict: null as unknown,
  requiresCuratorReview: false,
};

describe("self-service resolution truth", () => {
  it("always resolves a complete day", () => {
    expect(isSelfServiceComposable({ ...base, status: "complete" })).toBe(true);
  });

  it("resolves a partial day whose only gap is a discretionary taste", () => {
    expect(isSelfServiceComposable({ ...base, status: "partial" })).toBe(true);
    expect(resolveLivingAtlasCompositionResolution({ ...base, status: "partial" })).toBe("complete");
  });

  it("never resolves a partial day with an unmet anchor obligation", () => {
    expect(
      isSelfServiceComposable({ ...base, status: "partial", missingRequiredTypes: ["winery"] }),
    ).toBe(false);
  });

  it("never resolves a partial day with a timing conflict or curator verdict", () => {
    expect(isSelfServiceComposable({ ...base, status: "partial", conflict: { kind: "x" } })).toBe(
      false,
    );
    expect(
      isSelfServiceComposable({ ...base, status: "partial", requiresCuratorReview: true }),
    ).toBe(false);
  });

  it("never resolves a thin, tradeoff, impossible or empty day", () => {
    expect(isSelfServiceComposable({ ...base, status: "partial", moments: [1, 2] })).toBe(false);
    expect(isSelfServiceComposable({ ...base, status: "tradeoff" })).toBe(false);
    expect(isSelfServiceComposable({ ...base, status: "impossible" })).toBe(false);
    expect(isSelfServiceComposable({ ...base, status: "complete", moments: [] })).toBe(false);
    expect(isSelfServiceComposable(null)).toBe(false);
  });
});

describe("no-wine travellers are not anchored to a wine-defined Signature", () => {
  it("does not anchor a no-wine traveller to the wine-defined Arrábida Signature", () => {
    const res = resolveStudioV3Route({
      feeling: "romance",
      companions: "couple",
      rhythm: "balanced",
      interests: ["local-life", "photography"],
      pickup: "lisbon",
      investment: "elevated",
      dateExact: "2026-10-15",
    } as never) as { skeletonTourKey?: string };
    expect(res.skeletonTourKey).not.toBe("arrabida-wine-allinclusive");
  });

  it("still composes a wine day for a wine traveller", () => {
    const res = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
      pickup: "lisbon",
      investment: "elevated",
      dateExact: "2026-10-15",
    } as never) as { livingAtlasLive?: { liveResolution?: string } };
    expect(res.livingAtlasLive?.liveResolution).toBe("composed");
  });
});
