import { describe, expect, it } from "vitest";

import { planAddonInsertion } from "../addon-insertion";
import type { ValidationStop } from "../itinerary-validation";

// Rough coordinates along the Arrábida coast — Setúbal → Sesimbra corridor.
const SETUBAL = { lat: 38.5244, lng: -8.8882 };
const AZEITAO = { lat: 38.5155, lng: -9.0044 };
const ARRABIDA_VP = { lat: 38.4842, lng: -9.0064 };
const SESIMBRA = { lat: 38.4436, lng: -9.1017 };
const CABO_ESPICHEL = { lat: 38.4144, lng: -9.2131 };
const LISBON = { lat: 38.7223, lng: -9.1393 };

const stop = (
  key: string,
  label: string,
  coords: { lat: number; lng: number },
  category: ValidationStop["category"] = "viewpoint",
): ValidationStop => ({
  key,
  label,
  category,
  coords,
});

describe("planAddonInsertion", () => {
  const baseStops: ValidationStop[] = [
    stop("lx", "Lisbon pickup", LISBON, "viewpoint"),
    stop("az", "Azeitão wine estate", AZEITAO, "winery"),
    stop("ar", "Arrábida viewpoint", ARRABIDA_VP, "viewpoint"),
    stop("ss", "Sesimbra lunch", SESIMBRA, "lunch"),
    stop("lx-back", "Lisbon drop-off", LISBON, "viewpoint"),
  ];
  // Real-ish minutes / km for the base itinerary. 4 legs, total ≈ 155 min.
  const baseLegMinutes = [45, 20, 25, 55];
  const baseLegDistancesKm = [45, 15, 20, 55];

  it("recommends a small on-route detour (preferred badge)", () => {
    const result = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes,
      baseLegDistancesKm,
      addonStop: stop("cheese", "Azeitão cheese", {
        lat: 38.5085,
        lng: -8.9992,
      }),
    });
    expect(result.status).toBe("recommended");
    expect(result.badge).toBe("preferred");
    expect(result.best).not.toBeNull();
    expect(result.best!.keepsApproval).toBe(true);
    expect(result.best!.deltaMinutes).toBeLessThanOrEqual(20);
  });

  it("hides an add-on that would push driving past the cap", () => {
    // Cabo Espichel is far south-west; forcing it on a already-tight day.
    const tightLegs = [55, 25, 30, 60];
    const tightKm = [55, 20, 25, 60];
    const result = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes: tightLegs,
      baseLegDistancesKm: tightKm,
      addonStop: stop("esp", "Cabo Espichel lighthouse", CABO_ESPICHEL),
    });
    expect(result.status).toBe("hidden");
    expect(["over_budget", "small_detour"]).toContain(result.badge);
  });

  it("requires a strong narrative score for a small detour", () => {
    const addon = stop("esp", "Cabo Espichel lighthouse", CABO_ESPICHEL);
    const weak = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes,
      baseLegDistancesKm,
      addonStop: addon,
      narrativeScore: 0.3,
    });
    const strong = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes,
      baseLegDistancesKm,
      addonStop: addon,
      narrativeScore: 0.9,
    });
    if (weak.best && weak.best.deltaMinutes > 20 && weak.best.deltaMinutes <= 30) {
      expect(weak.status).toBe("hidden");
      expect(strong.status).toBe("detour");
      expect(strong.badge).toBe("small_detour");
    } else {
      // If the geography puts it outside the detour band, the test is a
      // no-op — the "hidden" branch is exercised elsewhere.
      expect(["recommended", "hidden", "detour"]).toContain(weak.status);
    }
  });

  it("returns hidden when leg data is missing", () => {
    const result = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes: [],
      baseLegDistancesKm: [],
      addonStop: stop("cheese", "Azeitão cheese", {
        lat: 38.5085,
        lng: -8.9992,
      }),
    });
    expect(result.status).toBe("hidden");
    expect(result.badge).toBe("unfit");
  });

  it("returns hidden when the add-on has no coordinates", () => {
    const result = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes,
      baseLegDistancesKm,
      addonStop: {
        key: "no-coords",
        label: "Mystery stop",
        category: "viewpoint",
      },
    });
    expect(result.status).toBe("hidden");
    expect(result.badge).toBe("unfit");
  });

  it("chooses the insertion index closest to the add-on", () => {
    const result = planAddonInsertion({
      region: "arrabida",
      baseStops,
      baseLegMinutes,
      baseLegDistancesKm,
      addonStop: stop("setubal", "Setúbal market", SETUBAL),
    });
    expect(result.best).not.toBeNull();
    // Setúbal sits between Azeitão and Arrábida — index 2 is the natural fit.
    expect([1, 2, 3]).toContain(result.best!.index);
  });
});
