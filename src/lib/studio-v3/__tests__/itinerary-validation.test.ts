import { describe, it, expect } from "vitest";
import { validateItinerary, type ValidationStop } from "@/lib/studio-v3/itinerary-validation";
import { resolveThresholds } from "@/lib/studio-v3/itinerary-thresholds";

const mkStop = (
  key: string,
  category: ValidationStop["category"] = "winery",
  coords?: { lat: number; lng: number },
): ValidationStop => ({
  key,
  label: key,
  category,
  coords,
});

describe("validateItinerary — state machine", () => {
  it("returns incomplete when there are not enough stops", () => {
    const r = validateItinerary({ region: "arrabida", stops: [mkStop("a")] });
    expect(r.status).toBe("incomplete");
    expect(r.failures[0].code).toBe("not_enough_stops");
  });

  it("returns incomplete when leg data is missing", () => {
    const r = validateItinerary({
      region: "arrabida",
      stops: [mkStop("a"), mkStop("b"), mkStop("c")],
    });
    expect(r.status).toBe("incomplete");
    expect(r.failures[0].code).toBe("missing_leg_data");
  });

  it("approves a clean, well-paced day", () => {
    const stops = [
      mkStop("winery-1", "winery", { lat: 38.5, lng: -8.9 }),
      mkStop("workshop", "workshop", { lat: 38.51, lng: -8.88 }),
      mkStop("lunch", "lunch", { lat: 38.515, lng: -8.87 }),
      mkStop("viewpoint", "viewpoint", { lat: 38.52, lng: -8.86 }),
    ];
    const r = validateItinerary({
      region: "arrabida",
      stops,
      legMinutes: [20, 15, 15],
      legDistancesKm: [12, 9, 8],
    });
    expect(r.status).toBe("approved");
    expect(r.failures.filter((f) => f.severity === "hard")).toHaveLength(0);
  });

  it("rejects when driving exceeds the absolute cap", () => {
    const t = resolveThresholds("arrabida");
    const stops = [
      mkStop("a", "winery"),
      mkStop("b", "lunch"),
      mkStop("c", "viewpoint"),
    ];
    const r = validateItinerary({
      region: "arrabida",
      stops,
      legMinutes: [t.maxDrivingMinAbs, 30],
      legDistancesKm: [50, 20],
    });
    expect(r.status).toBe("reject");
    expect(r.failures.some((f) => f.code === "driving_over_absolute_cap")).toBe(true);
  });

  it("rejects on a single hop that is too long", () => {
    const t = resolveThresholds("arrabida");
    const stops = [mkStop("a"), mkStop("b"), mkStop("c")];
    const r = validateItinerary({
      region: "arrabida",
      stops,
      legMinutes: [t.maxHopMin + 5, 10],
    });
    expect(r.status).toBe("reject");
    expect(r.failures.some((f) => f.code === "hop_too_long")).toBe(true);
    expect(r.suggestions.some((s) => s.action === "reorder_stops")).toBe(true);
  });

  it("flags review (soft) when driving is over preferred but under cap", () => {
    // Long-dwell day where drivingPct lands in (preferred, max]
    const stops = [
      mkStop("a", "workshop"),
      mkStop("b", "lunch"),
      mkStop("c", "viewpoint"),
    ];
    const r = validateItinerary({
      region: "arrabida",
      stops,
      legMinutes: [50, 50],
      legDistancesKm: [40, 40],
    });
    expect(r.status).toBe("review");
    expect(r.failures.some((f) => f.code === "driving_over_preferred_pct")).toBe(true);
  });

  it("rejects when the route backtracks against its overall bearing", () => {
    const stops = [
      mkStop("a", "winery", { lat: 38.5, lng: -9.0 }),
      mkStop("b", "lunch", { lat: 38.5, lng: -8.5 }),
      mkStop("c", "viewpoint", { lat: 38.5, lng: -9.2 }),
    ];
    const r = validateItinerary({
      region: "arrabida",
      stops,
      legMinutes: [25, 25],
      legDistancesKm: [40, 60],
    });
    expect(r.status).toBe("reject");
    expect(r.failures.some((f) => f.code === "backtrack_incoherent")).toBe(true);
  });
});
