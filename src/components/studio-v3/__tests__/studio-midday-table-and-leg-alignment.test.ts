import { describe, expect, it } from "vitest";

import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { bridgedBlueprintStopId } from "@/data/structuralStopBridge";
import { getTailorBlueprint } from "@/data/tailorBlueprints";
import { alignRouteLegsToItinerary } from "@/lib/studio-v3/itineraryLegAlignment";
import { composeHybridDay } from "@/components/studio-v3/studioHybridComposition";

const TABLE_STOPS = REGION_STOP_POOL.filter((stop) => stop.type === "table");

describe("included midday table inventory", () => {
  it("exists for every Signature whose blueprint core includes a lunch", () => {
    const anchorsWithLunch = [
      "arrabida-wine-allinclusive",
      "tiles-workshop",
      "azeitao-cheese",
      "sintra-cascais",
      "troia-comporta",
      "evora-alentejo",
      "tomar-coimbra",
      "fatima-nazare-obidos",
      "roman-heritage-alentejo",
    ];

    for (const anchorTourId of anchorsWithLunch) {
      const blueprint = getTailorBlueprint(anchorTourId);
      const coreLunch = (blueprint?.core ?? []).find((stop) => stop.category === "lunch");
      expect(coreLunch, `${anchorTourId} core lunch`).toBeTruthy();

      const bridged = TABLE_STOPS.filter(
        (stop) => bridgedBlueprintStopId(anchorTourId, stop.id) === coreLunch!.id,
      );
      expect(bridged.length, `${anchorTourId} bridged table stop`).toBe(1);
      expect(bridged[0]!.coords).toBeTruthy();
      expect(bridged[0]!.durationMin).toBeGreaterThan(0);
      expect(bridged[0]!.active).toBe(true);
    }
  });

  it("never names a restaurant, estate or supplier in guest-facing labels", () => {
    for (const stop of TABLE_STOPS) {
      expect(stop.name).not.toMatch(/herdade|quinta|adega|restaurante|casa\s|taberna/i);
    }
  });
});

describe("Tróia · Comporta bespoke composition", () => {
  it("composes a real day including the included table, with no passthrough", () => {
    const authored = [
      { index: 0, label: "Baía de Setúbal", story: "", lat: null, lng: null },
      { index: 1, label: "Roman Ruins of Troia", story: "", lat: null, lng: null },
      { index: 2, label: "Marina de Tróia", story: "", lat: null, lng: null },
      { index: 3, label: "Cais Palafítico do Porto da Carrasqueira", story: "", lat: null, lng: null },
      { index: 4, label: "Comporta", story: "", lat: null, lng: null },
    ];

    const result = composeHybridDay(authored as never, {
      skeletonTourId: "troia-comporta",
      feeling: "coastal",
      interests: ["gastronomy", "local-life"],
      rhythm: "balanced",
      wineIntent: null,
      dateExact: null,
      mandatoryOperationalLabels: [],
      internalTransitMinutes: 0,
      unverifiedConnectorLabels: [],
      mobilityConcern: false,
      pickupCoord: null,
      commercialContainment: true,
    } as never);

    expect(result.passthrough).toBe(false);
    const stopIds = (result.composition?.moments ?? []).map((moment) => moment.stopId);
    expect(stopIds).toContain("lunch-comporta-table");
    expect(result.composition?.status).toBe("complete");
  });
});

describe("closed-loop route leg alignment", () => {
  const routeStopKeys = ["origin", "0-A", "1-B", "2-C"];
  const itineraryStopKeys = ["0-A", "1-B", "2-C"];

  it("drops the return-to-origin leg the routing seam adds", () => {
    // [origin→A, A→B, B→C, C→origin]
    const aligned = alignRouteLegsToItinerary({
      routeStopKeys,
      legMinutes: [40, 10, 20, 55],
      itineraryStopKeys,
    });
    expect(aligned).toEqual([10, 20]);
  });

  it("still aligns open routes without a return leg", () => {
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys,
        legMinutes: [40, 10, 20],
        itineraryStopKeys,
      }),
    ).toEqual([10, 20]);
  });

  it("fails closed on any other leg count", () => {
    expect(
      alignRouteLegsToItinerary({
        routeStopKeys,
        legMinutes: [40, 10, 20, 55, 5],
        itineraryStopKeys,
      }),
    ).toBeNull();
  });
});
