import { it } from "vitest";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import { studioRouteShapingInput } from "@/components/studio-v3/studioRouteAuthority";
import { INITIAL_STATE } from "@/components/studio-v3/types";
it("probe", () => {
  const base: any = { ...INITIAL_STATE, feeling: "coastal", companions: "friends", rhythm: "full", interests: ["coast","gastronomy","nature"], pickup: "lisbon" };
  const r: any = resolveStudioV3Route(studioRouteShapingInput(base));
  console.log("tour", r.skeletonTourKey, "composed", r.composedRoutePoints.map((p:any)=>p.label));
  console.log("live", r.livingAtlasLive?.compositionResolution, r.livingAtlasLive?.fallbackReason, JSON.stringify(r.livingAtlasLive?.composition?.timing ?? {}).slice(0,400));
  console.log("rejected", JSON.stringify((r.livingAtlasLive?.composition?.rejected ?? []).slice(0,10)));
});
