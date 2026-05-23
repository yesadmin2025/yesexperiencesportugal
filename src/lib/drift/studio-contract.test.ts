import { describe, expect, it } from "vitest";
import { composeDay } from "./composer";
import { derivePrediction } from "./predict";
import { t } from "./i18n";

const emptyBehavior = {
  decisionLatency: [],
  lingerEvents: [],
  skipEvents: [],
  attractionEvents: [],
};

describe("Studio Drift contract", () => {
  it("keeps Portuguese formal and removes rejected personification / breathing copy", () => {
    const visiblePt = [
      t("chapter.opening", "pt"),
      t("chapter.companions", "pt"),
      t("chapter.radius", "pt"),
      t("reveal.hero_fallback", "pt"),
      t("build.eyebrow", "pt"),
    ].join(" ").toLowerCase();

    expect(visiblePt).not.toMatch(/\b(tu|teu|tua|teus|tuas|contigo|irias|respira|respirar)\b/);
    expect(visiblePt).not.toContain("portugal já está acordada");
    expect(visiblePt).not.toContain("portugal está a reparar");
    expect(visiblePt).toContain("o(a)");
  });

  it("defaults the customer-facing Studio language to English", () => {
    expect(t("chapter.name", "en")).toBe("what should we call you");
    expect(t("reveal.eyebrow", "en")).toBe("your Portugal story");
  });

  it("changes prediction from soft confidence before another explicit answer is asked", () => {
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
    expect(wine.tonalRegister).not.toBe(coast.tonalRegister);
  });

  it("collapses optional questions only when the engine is genuinely confident", () => {
    const prediction = derivePrediction(
      { "style:wine": 0.9, "energy:slow": 0.81, "social:intimate": 0.79 },
      emptyBehavior,
    );

    expect(prediction.collapseNextChapters).toEqual(["energy", "style", "social"]);
  });

  it("composes different real itineraries for different traveller signals", () => {
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

    expect(wineDay.stops.map((s) => s.stop.id)).not.toEqual(coastDay.stops.map((s) => s.stop.id));
    expect(wineDay.stops.some((s) => s.stop.kind === "winery" || s.stop.kind === "cellar")).toBe(true);
    expect(coastDay.stops.some((s) => s.stop.kind === "beach" || s.stop.kind === "viewpoint")).toBe(true);
  });
});