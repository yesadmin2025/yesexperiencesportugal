import { it } from "vitest";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import { studioRouteShapingInput } from "@/components/studio-v3/studioRouteAuthority";
import { INITIAL_STATE } from "@/components/studio-v3/types";
const profiles: any[] = [
  { feeling: "wine-food", companions: "couple", rhythm: "full", interests: ["wine","gastronomy","heritage"], pickup: "lisbon" },
  { feeling: "heritage", companions: "friends", rhythm: "full", interests: ["heritage","gastronomy"], pickup: "lisbon" },
  { feeling: "coastal", companions: "couple", rhythm: "full", interests: ["coast","nature"], pickup: "lisbon" },
  { feeling: "nature", companions: "family", rhythm: "immersive", interests: ["nature","coast","gastronomy"], pickup: "lisbon" },
];
it("probe", () => {
  for (const p of profiles) {
    const r: any = resolveStudioV3Route(studioRouteShapingInput({ ...INITIAL_STATE, ...p }));
    console.log(p.feeling, r.skeletonTourKey, r.composedRoutePoints.length, r.composedRoutePoints.map((x:any)=>x.label).join(" | "));
  }
});
