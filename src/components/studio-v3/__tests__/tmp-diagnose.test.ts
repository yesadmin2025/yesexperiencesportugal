import { describe, it } from "vitest";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";

describe("diagnose", () => {
  it("prints the live block for the audited walk", () => {
    const r = resolveStudioV3Route({
      feeling: "wine-food" as never,
      companions: "couple" as never,
      rhythm: "full" as never,
      interests: ["wine", "gastronomy"] as never,
      pickup: "lisbon-airport" as never,
      investment: "elevated" as never,
      dateExact: "2026-09-15",
    });
    const live = r.livingAtlasLive as Record<string, unknown> | null;
    console.log("skeleton", r.skeletonTourKey);
    console.log("composed labels", r.composedRoutePoints.map((p) => p.label));
    if (live) {
      console.log("liveResolution", live.liveResolution);
      console.log("fallbackReason", live.fallbackReason);
      console.log("compositionResolution", live.compositionResolution);
      console.log("passthroughReason", live.passthroughReason);
      console.log("commercialDisposition", live.commercialDisposition);
      const ledger = live.commercialLedger as
        | { actions?: unknown; notes?: unknown; entries?: Array<Record<string, unknown>> }
        | null;
      console.log("ledger actions", JSON.stringify(ledger?.actions));
      console.log("ledger notes", JSON.stringify(ledger?.notes));
      console.log(
        "ledger entries",
        JSON.stringify(
          (ledger?.entries ?? []).map((e) => ({
            l: e.label,
            k: e.kind,
            sr: e.structuralRole,
            pa: e.priceAction,
            id: e.inventoryStopId,
            bp: e.blueprintStopId,
          })),
          null,
          1,
        ),
      );
      const v = live.validation as Record<string, unknown> | null;
      console.log("validation", JSON.stringify(v));
      console.log("compositionStopIds", JSON.stringify(live.compositionStopIds));
      console.log("internalIssues", JSON.stringify(live.internalIssues));
    }
  });
});
