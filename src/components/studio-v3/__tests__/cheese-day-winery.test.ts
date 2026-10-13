/**
 * CHEESE DAY WINERY — the "Cheese & Wine in Azeitão" Signature includes the
 * Quinta de Catralvos cellar in its verified blueprint core. A traveller who
 * chose cheese without expressing wine intent must still get that winery:
 * swapping it out would silently sell a different day, and the filler stops
 * that replaced it (Azeitão village, tile factory) had no owner price, which
 * blocked checkout with "This day changed while we verified it".
 */
import { describe, expect, it } from "vitest";

import { composeLivingAtlasDay } from "@/components/studio-v3/livingAtlasComposer";
import { buildExperienceProfile } from "@/lib/studio-v3/livingAtlasBridge";
import { getTailorBlueprint } from "@/data/tailorBlueprints";

const profile = buildExperienceProfile({
  feeling: "hands-on",
  interests: ["gastronomy", "local-life"],
})!;

describe("cheese day keeps its structural winery", () => {
  it("the azeitao-cheese blueprint core really includes a winery", () => {
    const blueprint = getTailorBlueprint("azeitao-cheese");
    expect(blueprint?.core.some((stop) => stop.category === "winery")).toBe(true);
  });

  it("composes a complete day with the winery even without wine intent", () => {
    const res = composeLivingAtlasDay({
      anchorSignatureId: "azeitao-cheese",
      profile,
      density: "balanced",
      rhythm: "balanced",
      requiredTypes: ["workshop"],
      // No winery exclusion — mirrors the hybrid adapter when the anchor's
      // own core includes a winery.
      excludedTypes: [],
      mustIncludeStopIds: ["quinta-velha-cheese-workshop"],
      commercialContainment: true,
    });
    expect(res.status).toBe("complete");
    const ids = res.moments.map((moment) => moment.stopId);
    expect(ids).toContain("quinta-velha-cheese-workshop");
    expect(ids).toContain("quinta-de-catralvos");
  });
});
