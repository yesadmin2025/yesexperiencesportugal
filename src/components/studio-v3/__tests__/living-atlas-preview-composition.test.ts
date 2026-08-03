import { describe, expect, it } from "vitest";

import { ADD_ON_CATALOG } from "@/data/signatureAddOns";
import {
  composeLivingAtlasPreviewDay,
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  getLivingAtlasPreviewPool,
  livingAtlasPreviewDayTitle,
  resolveLivingAtlasPreviewDay,
} from "../livingAtlasPreviewComposition";

describe("Living Atlas preview composition", () => {
  it("adds only the verified Sesimbra boat experience from the existing catalogue", () => {
    const verified = ADD_ON_CATALOG["lisbon-arrabida"].find(
      (item) => item.id === "coastal-boat-ride",
    );
    const boat = getLivingAtlasPreviewPool().find((item) => item.id === "coastal-boat-ride");

    expect(verified).toBeDefined();
    expect(boat).toMatchObject({
      type: "boat",
      region: "arrabida-setubal",
      routeCluster: "arrabida-azeitao-sesimbra",
      signatureTourId: "arrabida-boat",
      durationMin: verified?.durationMinutes,
      active: true,
    });
  });

  it("builds a real one-winery, morning market and boat day on an open date", () => {
    const resolution = resolveLivingAtlasPreviewDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      selectedDate: "2026-08-04",
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
    const composition = resolution.composition;

    expect(composition.status).toBe("complete");
    expect(composition.moments.filter((moment) => moment.type === "winery")).toHaveLength(1);
    expect(composition.moments.some((moment) => moment.stopId === "mercado-do-livramento")).toBe(
      true,
    );
    expect(resolution.routePlan.orderedMoments[0].stopId).toBe("mercado-do-livramento");
    expect(composition.moments.some((moment) => moment.stopId === "coastal-boat-ride")).toBe(true);
    expect(composition.missingDimensions).toEqual([]);
    expect(livingAtlasPreviewDayTitle(composition)).not.toContain("Arrábida Wine");
  });

  it("removes Mercado do Livramento from Monday inventory and falls back honestly", () => {
    const composition = composeLivingAtlasPreviewDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      selectedDate: "2026-08-03",
      profile: {
        selected: ["wine-table", "local-life"],
        leads: ["wine-table"],
      },
      preferences: {
        ...DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
        localMoment: "market",
      },
    });

    expect(composition.moments.some((moment) => moment.stopId === "mercado-do-livramento")).toBe(
      false,
    );
  });

  it("does not force the boat when the traveller chooses the coast from land", () => {
    const composition = composeLivingAtlasPreviewDay({
      anchorSignatureId: "arrabida-wine-allinclusive",
      selectedDate: "2026-08-04",
      profile: {
        selected: ["wine-table", "atlantic-coast"],
        leads: ["wine-table"],
      },
      preferences: {
        ...DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
        atlanticMode: "coast",
      },
    });

    expect(composition.moments.some((moment) => moment.type === "boat")).toBe(false);
    expect(
      composition.moments.some(
        (moment) =>
          moment.type === "beach" || moment.type === "viewpoint" || moment.type === "nature",
      ),
    ).toBe(true);
  });
});
