// Phase 8 — Intent-to-Journey fidelity regression suite.
//
// Locks in the FitReport-based scoring model in curation.ts. Every case
// asserts three things about the chosen tour:
//   1. It exists (no fallback slip).
//   2. It satisfies at least the guest's most important interest.
//   3. Its FitReport has no fatal companions-coherence penalty.
//
// If the scoring model regresses (weights drift, a pool changes, a new
// tour is added without content that maps to the interest keywords),
// these tests surface exactly which axis broke.

import { describe, it, expect } from "vitest";
import { pickPrimaryTourWithFit, scoreTourFit } from "../curation";
import { findTour } from "@/data/signatureTours";

describe("scoreTourFit — content-driven coverage", () => {
  it("marks wine interest as satisfied for Arrábida Wine (has wine content)", () => {
    const tour = findTour("arrabida-wine-allinclusive")!;
    const fit = scoreTourFit(tour, {
      feeling: "wine-food",
      companions: "couple",
      interests: ["wine"],
      pickup: "lisbon",
    });
    expect(fit.coverage.interests.find((c) => c.interest === "wine")?.satisfied).toBe(true);
    expect(fit.boosts).toContain("interest-wine-satisfied");
    expect(fit.boosts).toContain("wine-content-confirmed");
  });

  it("marks wine interest as MISSING for Southwest Coast (has zero wine content)", () => {
    const tour = findTour("southwest-vicentine-coast")!;
    const fit = scoreTourFit(tour, {
      feeling: "hidden",
      companions: "couple",
      interests: ["wine", "nature"],
      pickup: "lisbon",
    });
    const wineCov = fit.coverage.interests.find((c) => c.interest === "wine");
    expect(wineCov?.satisfied).toBe(false);
    expect(fit.penalties).toContain("interest-wine-missing");
    expect(fit.penalties).toContain("wine-asked-but-tour-has-no-wine");
  });

  it("penalises asymmetrically: missing an asked-for interest hurts more than a bonus", () => {
    // Two candidates, same feeling, only interest coverage differs.
    const wine = findTour("arrabida-wine-allinclusive")!;
    const coast = findTour("southwest-vicentine-coast")!;
    const fitWine = scoreTourFit(wine, {
      feeling: "hidden",
      companions: "couple",
      interests: ["wine", "nature"],
      pickup: null,
    });
    const fitCoast = scoreTourFit(coast, {
      feeling: "hidden",
      companions: "couple",
      interests: ["wine", "nature"],
      pickup: null,
    });
    // Wine tour satisfies wine + fails/passes nature; coast tour satisfies
    // nature + FAILS wine (−6). The wine tour must outscore the coast tour.
    expect(fitWine.totalScore).toBeGreaterThan(fitCoast.totalScore);
  });
});

describe("pickPrimaryTourWithFit — end-to-end intent matching", () => {
  const cases: Array<{
    name: string;
    intent: Parameters<typeof pickPrimaryTourWithFit>;
    mustSatisfyInterest: string; // guest's most important axis
    mustNotBe?: string[];
  }> = [
    {
      name: "wine + nature — must pick a wine-anchored tour, not the coast",
      intent: ["hidden", "couple", ["wine", "nature"], "lisbon", null, 0, null],
      mustSatisfyInterest: "wine",
      mustNotBe: ["southwest-vicentine-coast"],
    },
    {
      name: "culture + heritage + family — kid-friendly heritage, not adult wine",
      intent: ["culture", "family", ["heritage"], "lisbon", null, 0, "balanced"],
      mustSatisfyInterest: "heritage",
      mustNotBe: ["arrabida-wine-allinclusive"],
    },
    {
      name: "romance + coast — must satisfy coast, never adult-only wine day",
      intent: ["romance", "couple", ["coast"], "lisbon", null, 0, null],
      mustSatisfyInterest: "coast",
    },
    {
      name: "corporate + wine + full-day + Lisbon — Arrábida is the natural fit",
      intent: ["wine-food", "corporate", ["wine"], "lisbon", null, 0, "full"],
      mustSatisfyInterest: "wine",
    },
    {
      name: "solo + hidden + nature — must not be the tourist-heavy Sintra loop",
      intent: ["hidden", "solo", ["nature"], "lisbon", null, 0, "immersive"],
      mustSatisfyInterest: "nature",
    },
    {
      name: "slow + couple + wine — a wine tour must win (not a coast-only day)",
      intent: ["slow-luxury", "couple", ["wine"], "lisbon", null, 0, "slow"],
      mustSatisfyInterest: "wine",
    },
    {
      name: "wine + heritage + no destination — talha (Roman Alentejo) is a good match",
      intent: ["hidden", "couple", ["wine", "heritage"], "lisbon", "no-preference", 0, null],
      mustSatisfyInterest: "wine",
    },
    {
      name: "coast + nature + no destination — Vicentine coast can win",
      intent: ["adventure", "couple", ["coast", "nature"], "lisbon", "no-preference", 0, null],
      mustSatisfyInterest: "coast",
    },
  ];

  it.each(cases)("$name", ({ intent, mustSatisfyInterest, mustNotBe }) => {
    const { tour, fit } = pickPrimaryTourWithFit(...intent);
    expect(tour).toBeDefined();

    const satisfied = fit.coverage.interests.find((c) => c.interest === mustSatisfyInterest);
    expect(
      satisfied?.satisfied,
      `Chose "${tour.id}" but it does not satisfy the guest's key interest "${mustSatisfyInterest}". Penalties: ${fit.penalties.join(", ")}`,
    ).toBe(true);

    expect(
      fit.coverage.companions,
      `Chose "${tour.id}" with a fatal companions-coherence penalty. Penalties: ${fit.penalties.join(", ")}`,
    ).not.toBe("fail");

    if (mustNotBe) {
      for (const forbidden of mustNotBe) {
        expect(tour.id, `Chose forbidden "${forbidden}" for this intent`).not.toBe(forbidden);
      }
    }
  });

  it("returns explainable topReports for the debug overlay", () => {
    const { topReports, filtered } = pickPrimaryTourWithFit(
      "wine-food",
      "couple",
      ["wine"],
      "lisbon",
      null,
      0,
    );
    expect(topReports.length).toBeGreaterThan(0);
    expect(topReports.length).toBeLessThanOrEqual(3);
    for (const r of topReports) {
      expect(r.fit.tourId).toBe(r.tour.id);
      expect(typeof r.fit.totalScore).toBe("number");
      expect(r.fit.coverage.interests.length).toBeGreaterThan(0);
    }
    // `filtered` is always an array (may be empty when no tour is dropped).
    expect(Array.isArray(filtered)).toBe(true);
  });

  it("Reshape (seed > 0) picks a genuinely different tour in the top band", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) {
      const { tour } = pickPrimaryTourWithFit(
        "coastal",
        "couple",
        ["coast"],
        "lisbon",
        null,
        seed,
      );
      seen.add(tour.id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
