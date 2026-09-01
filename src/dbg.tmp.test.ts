import { it } from "vitest";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
it("d", () => {
  const r: any = resolveStudioV3Route({ feeling: "romance", companions: "couple", rhythm: "balanced", interests: ["local-life","photography"], pickup: "lisbon", investment: "elevated", dateExact: "2026-10-15" } as any);
  console.log("SKEL", r.skeletonTourKey, r.livingAtlasLive?.liveResolution, r.livingAtlasLive?.fallbackReason, r.livingAtlasLive?.passthroughReason, r.livingAtlasLive?.composition?.status, JSON.stringify(r.livingAtlasLive?.composition?.moments?.map((m:any)=>m.stopId)), JSON.stringify(r.livingAtlasLive?.composition?.rejected), JSON.stringify(r.livingAtlasLive?.composition?.missingDimensions), JSON.stringify(r.livingAtlasLive?.composition?.planningTiming));
});
