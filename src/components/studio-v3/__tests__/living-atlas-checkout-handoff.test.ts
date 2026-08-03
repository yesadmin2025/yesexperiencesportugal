import { describe, expect, it } from "vitest";

import { buildLivingAtlasCheckoutHandoff } from "@/components/studio-v3/livingAtlasCheckoutHandoff";
import type { LivingAtlasRoutePlan } from "@/components/studio-v3/livingAtlasRoutePlanner";

const routePlan: LivingAtlasRoutePlan = {
  status: "ready",
  orderedMoments: [
    {
      stopId: "mercado-livramento",
      slotId: "mercado-livramento",
      replacedStopId: null,
      originalLabel: null,
      label: "Mercado do Livramento",
      type: "market",
      durationMin: 75,
      region: "arrabida-setubal",
      routeCluster: "arrabida-core",
      sourceTourIds: ["arrabida-wine-allinclusive"],
      dimensions: ["local-life"],
      score: 10,
      reasons: ["required-stop"],
    },
    {
      stopId: "quinta-example",
      slotId: "quinta-example",
      replacedStopId: null,
      originalLabel: null,
      label: "Quinta Example",
      type: "winery",
      durationMin: 90,
      region: "arrabida-setubal",
      routeCluster: "arrabida-core",
      sourceTourIds: ["arrabida-wine-allinclusive"],
      dimensions: ["wine-table"],
      score: 9,
      reasons: ["selected-dimension"],
    },
    {
      stopId: "sesimbra-boat",
      slotId: "sesimbra-boat",
      replacedStopId: null,
      originalLabel: null,
      label: "Sesimbra coastal boat experience",
      type: "boat",
      durationMin: 75,
      region: "arrabida-setubal",
      routeCluster: "arrabida-core",
      sourceTourIds: ["arrabida-boat"],
      dimensions: ["atlantic-coast"],
      score: 8,
      reasons: ["required-type"],
    },
  ],
  legs: [],
  totalEstimatedRoadKm: 24,
  totalEstimatedDrivingMin: 42,
  locatedMomentCount: 3,
  totalMomentCount: 3,
  maxDrivingMin: 180,
  maxTotalKm: 250,
  maxLegKm: 60,
  warnings: [],
  methodology: "verified-coordinates-estimate",
};

describe("Living Atlas checkout handoff", () => {
  it("keeps date and stable stop identifiers while hiding concrete winery names", () => {
    const handoff = buildLivingAtlasCheckoutHandoff({
      signatureId: "arrabida-wine-allinclusive",
      selectedDate: "2026-08-12",
      profile: {
        selected: ["wine-table", "atlantic-coast", "local-life"],
        leads: ["wine-table", "atlantic-coast"],
      },
      preferences: {
        density: "balanced",
        wineEmphasis: "one-winery",
        atlanticMode: "boat",
        localMoment: "market",
      },
      routePlan,
    });

    expect(handoff.selectedDate).toBe("2026-08-12");
    expect(handoff.stopIds).toEqual(["mercado-livramento", "quinta-example", "sesimbra-boat"]);
    expect(handoff.stopLabels).toContain("Selected winery in the region");
    expect(handoff.stopLabels.join(" ")).not.toContain("Quinta Example");
    expect(handoff.studioState.dateExact).toBe("2026-08-12");
    expect(handoff.studioState.tourId).toBe("arrabida-wine-allinclusive");
    expect(handoff.studioState.editedRoutePoints?.map((item) => item.label)).toEqual(
      handoff.stopLabels,
    );
  });

  it("carries operational disclosures without changing the selected moments", () => {
    const handoff = buildLivingAtlasCheckoutHandoff({
      signatureId: "arrabida-wine-allinclusive",
      selectedDate: "2026-08-12",
      profile: {
        selected: ["wine-table", "atlantic-coast", "local-life"],
        leads: ["wine-table"],
      },
      preferences: {
        density: "balanced",
        wineEmphasis: "one-winery",
        atlanticMode: "boat",
        localMoment: "market",
      },
      routePlan,
    });

    const boat = handoff.itinerary.find((moment) => moment.stopId === "sesimbra-boat");
    expect(boat?.note?.toLowerCase()).toMatch(/sea|weather/);
    expect(handoff.durationMinutes).toBe(240);
    expect(handoff.itinerary).toHaveLength(3);
  });
});
