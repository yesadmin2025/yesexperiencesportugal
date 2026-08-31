import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveStudioV3Route, resolveStudioV3CurationAuthority } from "../curation";
import {
  recordStudioV3CurationDecision,
  type StudioV3CurationDecision,
} from "@/lib/studio-v3-telemetry";

// Telemetry is gated off during `VITEST` runs to keep large suites from
// flooding stdout. We flip the gate off for this file so we can assert on
// the dispatched events end-to-end.
const ORIGINAL_VITEST = process.env.VITEST;

function collect(run: () => void): StudioV3CurationDecision[] {
  const seen: StudioV3CurationDecision[] = [];
  const handler = (e: Event) => seen.push((e as CustomEvent<StudioV3CurationDecision>).detail);
  window.addEventListener("studio-v3:curation.decision", handler);
  try {
    run();
  } finally {
    window.removeEventListener("studio-v3:curation.decision", handler);
  }
  return seen;
}

describe("Studio V3 — curation decision telemetry (single authority)", () => {
  beforeEach(() => {
    delete process.env.VITEST;
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    if (ORIGINAL_VITEST !== undefined) process.env.VITEST = ORIGINAL_VITEST;
    vi.restoreAllMocks();
  });

  it("emits NO legacy curation decision when the Living Atlas authority composes the day", () => {
    // Current canonical truth: the Living Atlas composition is the single
    // route authority for every Signature direction. Legacy curation does not
    // run, so it must not emit a decision either — one authority, one story.
    const seen = collect(() => {
      const route = resolveStudioV3Route({
        feeling: "wine-food",
        companions: "couple",
        rhythm: "balanced",
        interests: ["wine"],
        pickup: "lisbon",
        destinationIntent: "arrabida-setubal-azeitao",
      });
      expect(route.skeletonTourKey).toBeTruthy();
    });

    expect(seen).toHaveLength(0);
  });

  it("routes an unknown anchor through the legacy path exactly once", () => {
    const legacy = vi.fn(() => ({ ran: true }));
    const authority = resolveStudioV3CurationAuthority("not-a-living-atlas-signature", legacy);
    expect(authority.path).toBe("legacy");
    expect(legacy).toHaveBeenCalledTimes(1);
  });

  it("dispatches exactly one event per recorded decision, carrying picks and audit", () => {
    const payload: StudioV3CurationDecision = {
      tourId: "legacy-tour",
      tourTitleInternal: "Legacy tour",
      region: "arrabida-setubal",
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      dateExact: "2026-06-15",
      destinationIntent: "arrabida-setubal-azeitao",
      investment: null,
      poolSizeRaw: 9,
      poolSizeAfterClosures: 7,
      picked: ["Stop A", "Stop B"],
      rejections: [
        { label: "Mercado do Livramento", reason: "closed-on-date" },
        { label: "Third winery", reason: "winery-cap", detail: "region=arrabida cap=3" },
      ],
      wineSwapApplied: false,
      target: 4,
    } as StudioV3CurationDecision;

    const seen = collect(() => {
      recordStudioV3CurationDecision(payload);
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].tourId).toBe("legacy-tour");
    expect(seen[0].picked).toEqual(["Stop A", "Stop B"]);
    expect(seen[0].rejections.map((r) => r.reason)).toEqual(["closed-on-date", "winery-cap"]);
  });
});
