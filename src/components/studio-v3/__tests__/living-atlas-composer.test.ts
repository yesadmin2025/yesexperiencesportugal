import { describe, expect, it } from "vitest";

import type { OptionalStop, OptionalStopType } from "@/data/regionStopPool";
import { composeLivingAtlasDay } from "../livingAtlasComposer";

function stop(
  id: string,
  type: OptionalStopType,
  suitsInterests: string[],
  options: Partial<OptionalStop> = {},
): OptionalStop {
  return {
    id,
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    name: id
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    type,
    suitsInterests,
    suitsRhythm: ["slow", "balanced", "full", "immersive"],
    durationMin: 60,
    source: "signature-core",
    active: true,
    ...options,
  };
}

const ARRABIDA_POOL: OptionalStop[] = [
  stop("family-winery-one", "winery", ["wine", "gastronomy", "local-life"], {
    signatureTourId: "arrabida-wine-allinclusive",
    durationMin: 75,
  }),
  stop("family-winery-two", "winery", ["wine", "gastronomy"], {
    signatureTourId: "arrabida-wine-allinclusive",
    durationMin: 75,
  }),
  stop("mercado-do-livramento", "market", ["gastronomy", "local-life", "heritage"], {
    sourceTourIds: ["arrabida-wine-allinclusive", "tiles-workshop"],
    durationMin: 45,
  }),
  stop("sesimbra-coastal-boat", "boat", ["coast", "nature", "wonder"], {
    signatureTourId: "arrabida-boat",
    durationMin: 75,
  }),
  stop("arrabida-viewpoint", "viewpoint", ["coast", "nature", "photography"], {
    sourceTourIds: ["arrabida-wine-allinclusive", "arrabida-boat"],
    durationMin: 30,
  }),
];

describe("composeLivingAtlasDay", () => {
  it("builds one winery + boat + market when those are the guest's real priorities", () => {
    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      profile: {
        selected: ["wine-table", "atlantic-coast", "local-life"],
        leads: ["wine-table", "atlantic-coast"],
      },
      density: "balanced",
      requiredTypes: ["boat", "market"],
      maxByType: { winery: 1 },
      pool: ARRABIDA_POOL,
    });

    expect(result.status).toBe("complete");
    expect(result.moments.filter((moment) => moment.type === "winery")).toHaveLength(1);
    expect(result.moments.some((moment) => moment.type === "boat")).toBe(true);
    expect(result.moments.some((moment) => moment.type === "market")).toBe(true);
    expect(result.missingDimensions).toEqual([]);
  });

  it("does not satisfy a required boat using a stop from another route cluster", () => {
    const pool = [
      ...ARRABIDA_POOL.filter((item) => item.type !== "boat"),
      stop("remote-boat", "boat", ["coast", "nature"], {
        routeCluster: "unrelated-coast",
        signatureTourId: "arrabida-boat",
      }),
    ];

    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      profile: { selected: ["wine-table", "atlantic-coast"], leads: ["wine-table"] },
      density: "balanced",
      requiredTypes: ["boat"],
      pool,
    });

    expect(result.status).toBe("impossible");
    expect(result.missingRequiredTypes).toContain("boat");
    expect(result.moments.some((moment) => moment.stopId === "remote-boat")).toBe(false);
  });

  it("honours one-of groups", () => {
    const pool = [
      ...ARRABIDA_POOL,
      stop("beach-one", "beach", ["coast", "nature"], {
        oneOfGroup: "beach-choice",
        sourceTourIds: ["arrabida-wine-allinclusive"],
      }),
      stop("beach-two", "beach", ["coast", "nature"], {
        oneOfGroup: "beach-choice",
        sourceTourIds: ["arrabida-wine-allinclusive"],
      }),
    ];

    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      profile: { selected: ["atlantic-coast", "nature-landscapes"], leads: ["atlantic-coast"] },
      density: "rich",
      pool,
    });

    expect(result.moments.filter((moment) => moment.type === "beach").length).toBeLessThanOrEqual(1);
  });

  it("reports missing coverage instead of decorating the explanation", () => {
    const wineOnly = ARRABIDA_POOL.filter((item) => item.type === "winery");
    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      profile: {
        selected: ["wine-table", "hands-on-traditions"],
        leads: ["wine-table"],
      },
      density: "slow",
      pool: wineOnly,
    });

    expect(result.status).toBe("partial");
    expect(result.missingDimensions).toContain("hands-on-traditions");
  });

  it("keeps non-mandatory filling inside the duration budget", () => {
    const result = composeLivingAtlasDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      profile: { selected: ["wine-table"], leads: ["wine-table"] },
      density: "rich",
      maxStopMinutes: 150,
      pool: ARRABIDA_POOL,
    });

    expect(result.totalDurationMin).toBeLessThanOrEqual(150);
  });

  it("is deterministic for identical input", () => {
    const request = {
      anchorSignatureId: "arrabida-wine-allinclusive" as const,
      profile: {
        selected: ["wine-table", "atlantic-coast"] as const,
        leads: ["wine-table"] as const,
      },
      density: "balanced" as const,
      pool: ARRABIDA_POOL,
    };

    const first = composeLivingAtlasDay({
      ...request,
      profile: { selected: [...request.profile.selected], leads: [...request.profile.leads] },
    });
    const second = composeLivingAtlasDay({
      ...request,
      profile: { selected: [...request.profile.selected], leads: [...request.profile.leads] },
    });

    expect(second.moments.map((moment) => moment.stopId)).toEqual(
      first.moments.map((moment) => moment.stopId),
    );
  });
});
