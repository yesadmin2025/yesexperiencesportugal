// Studio Drift — regression suite.
//
// Locks down the contracts that the predictive AI + itinerary composer rely on,
// so previously-fixed regressions can't silently come back:
//
//   1. i18n: formal PT, EN default, no rejected/personified copy, name interpolation
//   2. inference: bump/decay, gaps, totalConfidence, sanitization clamping
//   3. behavior + prediction: pacing, holdScale, scene weighting differs per traveller,
//      collapseNextChapters only fires on high confidence, nextBestDimensions ranked
//   4. composer: real itineraries shift on tonalRegister + intensityPreference,
//      operational rules (max stops, kind caps, closed-on-monday) hold
//
// Pure unit tests — no I/O, no React render.

import { describe, expect, it } from "vitest";
import { composeDay } from "./composer";
import { derivePrediction } from "./predict";
import {
  bump,
  gaps,
  projectProfile,
  sanitizeConfidence,
  topValue,
  totalConfidence,
} from "./inference";
import { classifyPacing, intensityPreference, moodAffinity, type BehaviorState } from "./behavior";
import { t, tName, type DriftLocale } from "./i18n";
import { REGION_RULES } from "@/data/regionRules";

const emptyBehavior: BehaviorState = {
  decisionLatency: [],
  lingerEvents: [],
  skipEvents: [],
  attractionEvents: [],
};

const REJECTED_PT = [
  "respira",
  "respirar",
  "portugal já está acordada",
  "portugal está a reparar",
];

const INFORMAL_PT_RE = /\b(tu|teu|tua|teus|tuas|contigo|irias|te)\b/;

describe("Studio Drift · i18n regression", () => {
  const SAMPLED_KEYS = [
    "chapter.opening",
    "chapter.name",
    "chapter.companions",
    "chapter.pickup",
    "chapter.radius",
    "chapter.energy",
    "chapter.style",
    "chapter.social",
    "reveal.eyebrow",
    "reveal.hero_fallback",
    "reveal.signed_by",
    "build.eyebrow",
    "cta.book",
    "cta.refine",
    "cta.whatsapp",
    "enc.start",
    "enc.middle",
    "enc.late",
    "enc.near",
  ];

  it("keeps PT formal and free of rejected/personified copy", () => {
    const blob = SAMPLED_KEYS.map((k) => t(k, "pt")).join(" \n ").toLowerCase();
    expect(blob).not.toMatch(INFORMAL_PT_RE);
    for (const phrase of REJECTED_PT) expect(blob).not.toContain(phrase);
    // Formal address marker should appear at least once in PT.
    expect(blob).toMatch(/(você|consigo|o\(a\)|seu|sua)/);
  });

  it("defaults customer-facing strings to English (US/international)", () => {
    // Canonical EN copy lives in src/lib/drift/i18n.ts. Markdown
    // emphasis (`*word*`) is part of the rendered voice and is
    // intentional — see the dictionary in i18n.ts for source of truth.
    expect(t("chapter.name", "en")).toBe("First — what should we *call* you?");
    expect(t("reveal.eyebrow", "en")).toBe("Your Portugal day");
    expect(t("cta.book", "en")).toBe("Secure Your Experience");
  });

  it("exposes ES + FR for non-English speakers without falling back to PT", () => {
    for (const loc of ["es", "fr"] as DriftLocale[]) {
      const eyebrow = t("reveal.eyebrow", loc);
      expect(eyebrow).not.toBe(t("reveal.eyebrow", "pt"));
      expect(eyebrow.length).toBeGreaterThan(0);
    }
  });

  it("interpolates the traveller name into every locale's reveal eyebrow", () => {
    for (const loc of ["en", "pt", "es", "fr"] as DriftLocale[]) {
      const named = tName("reveal.eyebrow", loc, "Sofia");
      expect(named).toContain("Sofia");
      // Falls back gracefully when no name supplied.
      expect(tName("reveal.eyebrow", loc, undefined)).toBe(t("reveal.eyebrow", loc));
      expect(tName("reveal.eyebrow", loc, "   ")).toBe(t("reveal.eyebrow", loc));
    }
  });

  it("never leaves a placeholder unreplaced or returns the raw key", () => {
    for (const loc of ["en", "pt", "es", "fr"] as DriftLocale[]) {
      for (const k of SAMPLED_KEYS) {
        const v = t(k, loc);
        expect(v).not.toBe(k);
        expect(v).not.toMatch(/\{name\}/);
      }
    }
  });
});

describe("Studio Drift · inference regression", () => {
  it("bumps target value and softly decays competitors in the same dimension", () => {
    const a = bump({}, "style", "wine", 0.6);
    expect(a["style:wine"]).toBeCloseTo(0.6, 5);
    const b = bump(a, "style", "wine", 0.6); // clamp to 1
    expect(b["style:wine"]).toBeLessThanOrEqual(1);
    const c = bump({ "style:coast": 0.8, "style:wine": 0.1 }, "style", "wine", 0.4);
    expect(c["style:wine"]).toBeGreaterThan(0.1);
    expect(c["style:coast"]).toBeLessThan(0.8); // decayed
    // Cross-dimension values untouched.
    const d = bump({ "energy:slow": 0.7 }, "style", "wine", 0.5);
    expect(d["energy:slow"]).toBe(0.7);
  });

  it("topValue + totalConfidence reflect explicit picks", () => {
    const map = bump(bump({}, "style", "wine", 1), "social", "intimate", 1);
    expect(topValue(map, "style")?.value).toBe("wine");
    expect(totalConfidence(map)).toBeGreaterThan(0);
    expect(totalConfidence(map)).toBeLessThanOrEqual(1);
  });

  it("gaps ranks the most uncertain dimensions first (drives next-best whisper)", () => {
    const map = bump(bump({}, "style", "wine", 1), "energy", "slow", 0.9);
    const g = gaps(map);
    // Dimensions with no signal must outrank the explicitly-set ones.
    expect(g[0].gap).toBe(1);
    expect(g[g.length - 1].dim === "style" || g[g.length - 1].dim === "energy").toBe(true);
  });

  it("projectProfile only commits values above the confidence floor", () => {
    const map = { "style:wine": 0.6, "energy:slow": 0.4 };
    const profile = projectProfile(map, 0.5);
    expect(profile.style).toBe("wine");
    expect(profile.energy).toBeUndefined();
  });

  it("sanitizeConfidence drops malformed keys and clamps numeric range", () => {
    const dirty = {
      "style:wine": 1.4, // clamp up
      "energy:slow": -0.2, // clamp down
      "BAD KEY": 0.5, // wrong shape
      [`${"x".repeat(60)}:y`]: 0.5, // too long
      "style:WINE": 0.5, // uppercase value disallowed
      "social:intimate": "0.7" as unknown as number, // numeric string ok
      "social:bad shared": 0.5, // space disallowed
      "proto:pollution": 1 as unknown as number,
    };
    const clean = sanitizeConfidence(dirty);
    expect(clean["style:wine"]).toBe(1);
    expect(clean["energy:slow"]).toBe(0);
    expect(clean["social:intimate"]).toBeCloseTo(0.7, 5);
    expect(clean["BAD KEY"]).toBeUndefined();
    expect(clean["style:WINE"]).toBeUndefined();
    expect(clean["social:bad shared"]).toBeUndefined();
    expect(sanitizeConfidence(null)).toEqual({});
    expect(sanitizeConfidence("nope")).toEqual({});
  });
});

describe("Studio Drift · behavior + prediction regression", () => {
  it("classifies decisive / balanced / exploratory pacing from latency median", () => {
    expect(classifyPacing({ ...emptyBehavior, decisionLatency: [500, 700] })).toBe("decisive");
    expect(classifyPacing({ ...emptyBehavior, decisionLatency: [1800, 2200] })).toBe("balanced");
    expect(classifyPacing({ ...emptyBehavior, decisionLatency: [5000, 6000] })).toBe("exploratory");
    // Too little data → safe default.
    expect(classifyPacing(emptyBehavior)).toBe("balanced");
  });

  it("intensity preference averages only over attractions with intensity", () => {
    const state: BehaviorState = {
      ...emptyBehavior,
      attractionEvents: [
        { sceneId: "a", intensity: 4, weight: 1 },
        { sceneId: "b", intensity: 2, weight: 1 },
        { sceneId: "c", weight: 1 }, // no intensity, ignored
      ],
    };
    expect(intensityPreference(state)).toBe(3);
    expect(intensityPreference(emptyBehavior)).toBe(3); // fallback
  });

  it("moodAffinity boosts attracted moods and dampens skipped moods", () => {
    const state: BehaviorState = {
      ...emptyBehavior,
      attractionEvents: [{ sceneId: "x", mood: "ritual", weight: 1 }],
      skipEvents: [{ sceneId: "y", mood: "celebration" }],
    };
    const m = moodAffinity(state);
    expect(m.ritual).toBeGreaterThan(0.5);
    expect(m.celebration).toBeLessThan(0.5);
  });

  it("scales holdMs by pacing class so explorers get more breathing room", () => {
    const decisive = derivePrediction({}, { ...emptyBehavior, decisionLatency: [400, 500] });
    const explorer = derivePrediction({}, { ...emptyBehavior, decisionLatency: [5000, 6000] });
    expect(decisive.holdScale).toBeLessThan(1);
    expect(explorer.holdScale).toBeGreaterThan(1);
  });

  it("sceneWeighting differentiates traveller profiles before any explicit answer", () => {
    const wine = derivePrediction(
      { "style:wine": 0.72, "energy:slow": 0.54, "social:intimate": 0.48 },
      emptyBehavior,
    );
    const coast = derivePrediction(
      { "style:coast": 0.72, "energy:vivid": 0.54, "social:shared": 0.48 },
      emptyBehavior,
    );
    expect(wine.sceneWeighting.ritual).toBeGreaterThan(coast.sceneWeighting.ritual);
    expect(coast.sceneWeighting.discovery).toBeGreaterThan(wine.sceneWeighting.discovery);
    expect(coast.sceneWeighting.celebration).toBeGreaterThan(wine.sceneWeighting.celebration);
    expect(wine.tonalRegister).not.toBe(coast.tonalRegister);
  });

  it("collapseNextChapters only fires when the engine is genuinely confident", () => {
    const low = derivePrediction(
      { "style:wine": 0.55, "energy:slow": 0.4, "social:intimate": 0.3 },
      emptyBehavior,
    );
    expect(low.collapseNextChapters).toEqual([]);

    const high = derivePrediction(
      { "style:wine": 0.9, "energy:slow": 0.81, "social:intimate": 0.79 },
      emptyBehavior,
    );
    expect(high.collapseNextChapters).toEqual(["energy", "style", "social"]);
  });

  it("nextBestDimensions orders by largest remaining need", () => {
    const pred = derivePrediction(
      { "energy:slow": 0.9, "style:wine": 0.2 },
      emptyBehavior,
    );
    expect(pred.nextBestDimensions[pred.nextBestDimensions.length - 1]).toBe("energy");
    expect(pred.nextBestDimensions).toContain("style");
    expect(pred.nextBestDimensions).toContain("social");
  });

  it("revealConfidence blends confidence map with interaction richness", () => {
    const sparse = derivePrediction({ "style:wine": 0.5 }, emptyBehavior);
    const rich = derivePrediction(
      { "style:wine": 0.5 },
      {
        ...emptyBehavior,
        decisionLatency: [1200, 1400, 1300, 1500],
        attractionEvents: [
          { sceneId: "a", mood: "ritual", intensity: 3, weight: 1 },
          { sceneId: "b", mood: "intimacy", intensity: 3, weight: 1 },
          { sceneId: "c", mood: "ritual", intensity: 3, weight: 1 },
          { sceneId: "d", mood: "ritual", intensity: 3, weight: 1 },
        ],
      },
    );
    expect(rich.revealConfidence).toBeGreaterThan(sparse.revealConfidence);
    expect(rich.revealConfidence).toBeLessThanOrEqual(1);
  });
});

describe("Studio Drift · composer regression", () => {
  it("composes meaningfully different itineraries for wine-slow-intimate vs coast-vivid-shared", () => {
    const wineDay = composeDay(
      { pickup: "lisbon", radius: "far", style: "wine", energy: "slow", social: "intimate" },
      "arrabida",
      { weekday: 2, month: 6, tonalRegister: "ritual", intensityPreference: 2 },
    );
    const coastDay = composeDay(
      { pickup: "lisbon", radius: "far", style: "coast", energy: "vivid", social: "shared" },
      "arrabida",
      { weekday: 2, month: 6, tonalRegister: "playful", intensityPreference: 5 },
    );

    expect(wineDay.stops.length).toBeGreaterThan(0);
    expect(coastDay.stops.length).toBeGreaterThan(0);
    expect(wineDay.stops.map((s) => s.stop.id)).not.toEqual(coastDay.stops.map((s) => s.stop.id));
    expect(wineDay.stops.some((s) => s.stop.kind === "winery" || s.stop.kind === "cellar")).toBe(true);
    expect(coastDay.stops.some((s) => s.stop.kind === "beach" || s.stop.kind === "viewpoint")).toBe(
      true,
    );
  });

  it("respects regional operational caps (max stops, max drive, max hop)", () => {
    const day = composeDay(
      { pickup: "lisbon", radius: "far", style: "heritage", energy: "slow", social: "intimate" },
      "lisbon-coast",
      { weekday: 3, month: 6 },
    );
    const rules = REGION_RULES["lisbon-coast"];
    expect(day.stops.length).toBeLessThanOrEqual(rules.maxStops);
    expect(day.totals.driveMin).toBeLessThanOrEqual(rules.maxDriveMinutes);
    // Per-stop drive hops should never exceed the regional max hop.
    for (const s of day.stops) {
      expect(s.driveFromPrev).toBeLessThanOrEqual(rules.maxHopMinutes);
    }
  });

  it("soft confidence (no explicit profile field) still shapes the itinerary", () => {
    const base = composeDay({ pickup: "lisbon", radius: "far" }, "arrabida", {
      weekday: 2,
      month: 6,
    });
    const tilted = composeDay({ pickup: "lisbon", radius: "far" }, "arrabida", {
      weekday: 2,
      month: 6,
      confidence: { "style:wine": 0.8, "social:intimate": 0.7, "energy:slow": 0.7 },
      tonalRegister: "ritual",
      intensityPreference: 2,
    });
    expect(tilted.stops.map((s) => s.stop.id)).not.toEqual(base.stops.map((s) => s.stop.id));
  });

  it("never leaves the day with zero stops on a normal weekday in season", () => {
    for (const region of ["arrabida", "lisbon-coast", "centro", "alentejo"] as const) {
      const day = composeDay(
        { pickup: "lisbon", radius: "far", style: "heritage", energy: "slow", social: "intimate" },
        region,
        { weekday: 3, month: 6 },
      );
      expect(day.stops.length).toBeGreaterThan(0);
      expect(day.originLabel.length).toBeGreaterThan(0);
    }
  });
});
