import { describe, expect, it } from "vitest";

import {
  LIVING_ATLAS_TIMING_DISCLOSURE,
  livingAtlasMomentDisclosure,
  livingAtlasPublicMomentLabel,
} from "../livingAtlasPublicCopy";

describe("Living Atlas public itinerary copy", () => {
  it("never exposes a concrete winery identity", () => {
    expect(
      livingAtlasPublicMomentLabel({ stopId: "quinta-example", label: "Quinta Example", type: "winery" }),
    ).toBe("Selected winery in the region");
    expect(
      livingAtlasPublicMomentLabel(
        { stopId: "quinta-example", label: "Quinta Example", type: "winery" },
        2,
        2,
      ),
    ).toBe("Selected regional winery 2");
  });

  it("keeps the boat promise conditional on sea and weather", () => {
    const moment = { stopId: "coastal-boat-ride", label: "Boat", type: "boat" as const };
    expect(livingAtlasPublicMomentLabel(moment)).toBe("Coastal boat experience in Sesimbra");
    expect(livingAtlasMomentDisclosure(moment)).toBe("Subject to sea and weather conditions.");
  });

  it("states that timings may move without removing the selected content", () => {
    expect(LIVING_ATLAS_TIMING_DISCLOSURE).toMatch(/content of the day is preserved/i);
  });
});
