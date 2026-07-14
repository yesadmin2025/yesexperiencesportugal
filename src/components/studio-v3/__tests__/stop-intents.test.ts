// Studio V3 — stop-level intent tag regression suite.
//
// Locks in the tag catalog in `src/data/stopIntents.ts`. Every Signature
// stop MUST carry ≥1 intent, and each tour's dominant intent set MUST
// contain something coherent with its declared `theme`.

import { describe, it, expect } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import {
  TOUR_STOP_INTENTS,
  tourIntentProfile,
  interestCoverageFromProfile,
  type StopIntent,
} from "@/data/stopIntents";

describe("stop-level intent tags", () => {
  // REGRESSION GUARD
  // -----------------------------------------------------------------
  // A new Signature stop added to `signatureTours.ts` without a
  // matching entry in `TOUR_STOP_INTENTS` (src/data/stopIntents.ts)
  // silently degrades matching — the tour's intent profile loses a
  // signal and the "Why this journey" evidence goes cold. This test
  // fails CI so intent coverage cannot regress.
  it("REGRESSION: every Signature stop must have ≥1 intent tag", () => {
    const missing: string[] = [];
    for (const tour of signatureTours) {
      const stopMap = TOUR_STOP_INTENTS[tour.id] ?? {};
      for (const stop of tour.stops) {
        const intents = stopMap[stop.label];
        if (!intents || intents.length === 0) {
          missing.push(`${tour.id} :: ${stop.label}`);
        }
      }
    }
    expect(missing, `Untagged stops:\n${missing.join("\n")}`).toEqual([]);
  });

  // REGRESSION GUARD
  // -----------------------------------------------------------------
  // Catches the reverse drift: a stop label was renamed / removed in
  // `signatureTours.ts` but its tag entry lingers in TOUR_STOP_INTENTS.
  // The orphan key would score nothing yet mask that the real stop is
  // now untagged.
  it("REGRESSION: TOUR_STOP_INTENTS has no orphan keys", () => {
    const orphans: string[] = [];
    for (const [tourId, stopMap] of Object.entries(TOUR_STOP_INTENTS)) {
      const tour = signatureTours.find((t) => t.id === tourId);
      if (!tour) {
        orphans.push(`unknown tour: ${tourId}`);
        continue;
      }
      const realLabels = new Set(tour.stops.map((s) => s.label));
      for (const label of Object.keys(stopMap)) {
        if (!realLabels.has(label)) orphans.push(`${tourId} :: ${label}`);
      }
    }
    expect(orphans, `Orphan tag entries:\n${orphans.join("\n")}`).toEqual([]);
  });

  // REGRESSION GUARD
  // -----------------------------------------------------------------
  // If a tour ends up with zero dominant intents (e.g. its entry was
  // deleted from TOUR_STOP_INTENTS), the FitReport can never justify
  // picking it — matching collapses silently. Fail loudly instead.
  it("REGRESSION: every tour resolves to ≥1 dominant intent", () => {
    const empty: string[] = [];
    for (const tour of signatureTours) {
      const profile = tourIntentProfile(tour);
      if (profile.dominant.length === 0) empty.push(tour.id);
    }
    expect(empty, `Tours with no dominant intents:\n${empty.join("\n")}`).toEqual([]);
  });

  it("every tour's dominant intents include something coherent with its theme", () => {
    const themeToIntent: Record<string, StopIntent[]> = {
      Wine: ["wine"],
      Coastal: ["coast", "nature"],
      Heritage: ["heritage", "culture", "craft"],
      Gastronomy: ["gastronomy", "wine", "craft"],
    };
    const mismatches: string[] = [];
    for (const tour of signatureTours) {
      const expected = themeToIntent[tour.theme];
      if (!expected) continue;
      const dominant = tourIntentProfile(tour).dominant;
      if (!expected.some((i) => dominant.includes(i))) {
        mismatches.push(`${tour.id} (theme=${tour.theme}) → dominant=${dominant.join(",")}`);
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });

  it("Southwest Vicentine Coast has ZERO wine-tagged stops (source of the wine+nature bug)", () => {
    const tour = signatureTours.find((t) => t.id === "southwest-vicentine-coast")!;
    const profile = tourIntentProfile(tour);
    expect(profile.tags.wine ?? 0).toBe(0);
    const cov = interestCoverageFromProfile(profile, "wine");
    expect(cov.strength).toBe("none");
    expect(cov.evidence).toEqual([]);
  });

  it("Arrábida wine day has strong wine coverage with real stop evidence", () => {
    const tour = signatureTours.find((t) => t.id === "arrabida-wine-allinclusive")!;
    const cov = interestCoverageFromProfile(tourIntentProfile(tour), "wine");
    expect(cov.strength).toBe("strong");
    expect(cov.count).toBeGreaterThanOrEqual(4);
    expect(cov.evidence).toContain("House & Museum José Maria Da Fonseca");
  });

  it("Tile workshop day carries wine evidence via its winery stops", () => {
    const tour = signatureTours.find((t) => t.id === "tiles-workshop")!;
    const cov = interestCoverageFromProfile(tourIntentProfile(tour), "wine");
    expect(cov.strength).toBe("strong");
    expect(cov.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("Évora day carries strong wine + strong heritage (cross-signal user asked for)", () => {
    const tour = signatureTours.find((t) => t.id === "evora-alentejo")!;
    const profile = tourIntentProfile(tour);
    expect(interestCoverageFromProfile(profile, "wine").strength).toBe("strong");
    expect(interestCoverageFromProfile(profile, "heritage").strength).toBe("strong");
  });
});
