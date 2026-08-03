import { describe, expect, it } from "vitest";

import {
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  getLivingAtlasPreviewPool,
  resolveLivingAtlasPreviewDay,
} from "../livingAtlasPreviewComposition";

describe("Living Atlas Arrábida public route anchors", () => {
  it("adds verified public anchors without inventing a supplier location", () => {
    const pool = getLivingAtlasPreviewPool();

    expect(pool.find((stop) => stop.id === "mercado-do-livramento")?.coords).toEqual({
      lat: 38.5230586463,
      lng: -8.8941629989,
    });
    expect(pool.find((stop) => stop.id === "parque-natural-arrabida")?.coords).toEqual({
      lat: 38.48146,
      lng: -8.98934,
    });
    expect(pool.find((stop) => stop.id === "azeitao-village")?.coords).toEqual({
      lat: 38.51868,
      lng: -9.01387,
    });
    expect(pool.find((stop) => stop.id === "sesimbra-village")?.coords).toEqual({
      lat: 38.4436755,
      lng: -9.1004624,
    });
    expect(pool.find((stop) => stop.id === "quinta-de-catralvos")?.coords).toBeUndefined();
  });

  it("keeps the Azeitão cheese precision-fork direction bookable with a partial route", () => {
    const resolution = resolveLivingAtlasPreviewDay({
      anchorSignatureId: "azeitao-cheese",
      selectedDate: "2026-08-06",
      profile: {
        selected: ["wine-table", "atlantic-coast", "local-life"],
        leads: ["wine-table", "atlantic-coast"],
      },
      preferences: {
        ...DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
        atlanticMode: "boat",
        localMoment: "market",
        wineEmphasis: "one-winery",
      },
    });

    expect(resolution.composition.status).toBe("complete");
    expect(resolution.routePlan.status).toBe("partial");
    expect(resolution.routePlan.locatedMomentCount).toBeGreaterThanOrEqual(2);
    expect(resolution.routePlan.status).not.toBe("unavailable");
    expect(resolution.routePlan.status).not.toBe("over-budget");
  });
});
