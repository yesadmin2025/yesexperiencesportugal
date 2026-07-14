import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveStudioV3Route } from "../curation";
import type { StudioV3CurationDecision } from "@/lib/studio-v3-telemetry";

// Telemetry is gated off during `VITEST` runs to keep large suites from
// flooding stdout. We flip the gate off for this file so we can assert on
// the dispatched events end-to-end.
const ORIGINAL_VITEST = process.env.VITEST;

describe("Studio V3 — Phase 5 telemetry", () => {
  beforeEach(() => {
    delete process.env.VITEST;
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    if (ORIGINAL_VITEST !== undefined) process.env.VITEST = ORIGINAL_VITEST;
    vi.restoreAllMocks();
  });

  it("emits a single studio-v3:curation.decision event per resolve, with picked stops and audit", () => {
    const seen: StudioV3CurationDecision[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<StudioV3CurationDecision>).detail);
    window.addEventListener("studio-v3:curation.decision", handler);

    const route = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
      pickup: "lisbon",
      destinationIntent: "arrabida-setubal-azeitao",
    });

    window.removeEventListener("studio-v3:curation.decision", handler);

    expect(seen).toHaveLength(1);
    const decision = seen[0];
    expect(decision.tourId).toBe(route.skeletonTourKey);
    expect(decision.feeling).toBe("wine-food");
    expect(decision.companions).toBe("couple");
    expect(decision.rhythm).toBe("balanced");
    expect(decision.picked.length).toBeGreaterThan(0);
    expect(decision.poolSizeRaw).toBeGreaterThan(0);
    expect(decision.poolSizeAfterClosures).toBeLessThanOrEqual(decision.poolSizeRaw);
    expect(Array.isArray(decision.rejections)).toBe(true);
  });

  it("records winery-cap rejections when the pool exceeds the cap of 3", () => {
    const seen: StudioV3CurationDecision[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<StudioV3CurationDecision>).detail);
    window.addEventListener("studio-v3:curation.decision", handler);

    resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "immersive",
      interests: ["wine"],
      pickup: "lisbon",
      destinationIntent: "arrabida-setubal-azeitao",
    });

    window.removeEventListener("studio-v3:curation.decision", handler);

    const wineryRejections = seen[0]?.rejections.filter((r) => r.reason === "winery-cap");
    expect(wineryRejections && wineryRejections.length).toBeGreaterThan(0);
    expect(wineryRejections?.[0].detail).toMatch(/region=.+cap=\d+/);
  });

  it("records closed-on-date rejections for Mercado do Livramento on Mondays", () => {
    const seen: StudioV3CurationDecision[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<StudioV3CurationDecision>).detail);
    window.addEventListener("studio-v3:curation.decision", handler);

    // 2026-06-15 is a Monday.
    resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
      pickup: "lisbon",
      destinationIntent: "arrabida-setubal-azeitao",
      dateExact: "2026-06-15",
    });

    window.removeEventListener("studio-v3:curation.decision", handler);

    const closed = seen[0]?.rejections.filter((r) => r.reason === "closed-on-date");
    expect(closed?.some((r) => /Livramento/i.test(r.label))).toBe(true);
  });
});
