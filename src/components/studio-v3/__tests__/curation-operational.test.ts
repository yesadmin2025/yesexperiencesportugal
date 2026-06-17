import { describe, expect, it } from "vitest";
import { curateJourney, resolveStudioV3Route } from "../curation";

const WINE_RE = /\b(wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca|catralvos|palmela)\b/i;
const LIVRAMENTO_RE = /mercado\s+do\s+livramento/i;

/**
 * Operational truth tests for the Studio V3 curation layer.
 * These guard two non-negotiables surfaced by real user tests:
 *   1) Mercado do Livramento is closed on Mondays — never proposed on Mon.
 *   2) Even for wine-led travellers, the day caps at 3 winery-style stops.
 */
describe("Studio V3 curation — operational truth", () => {
  describe("Mercado do Livramento Monday closure", () => {
    // 2026-06-15 is a Monday. Pickup Arrábida → arrabida-wine-allinclusive
    // skeleton, which has Livramento as the opening stop.
    const MONDAY = "2026-06-15";
    const TUESDAY = "2026-06-16";

    it("removes Livramento from the Arrábida wine day when the date is a Monday", () => {
      const journey = curateJourney("wine-food", "couple", "immersive", {
        interests: ["wine", "gastronomy"],
        pickup: "sesimbra-setubal-arrabida",
        destinationIntent: "arrabida-setubal-azeitao",
        dateExact: MONDAY,
      });
      expect(journey.moments.length).toBeGreaterThan(0);
      expect(
        journey.moments.some((m) => LIVRAMENTO_RE.test(m.label)),
      ).toBe(false);
    });

    it("allows Livramento back on a non-Monday (Tuesday) for the same inputs", () => {
      const journey = curateJourney("wine-food", "couple", "immersive", {
        interests: ["wine", "gastronomy"],
        pickup: "sesimbra-setubal-arrabida",
        destinationIntent: "arrabida-setubal-azeitao",
        dateExact: TUESDAY,
      });
      expect(
        journey.moments.some((m) => LIVRAMENTO_RE.test(m.label)),
      ).toBe(true);
    });

    it("forwards dateExact through resolveStudioV3Route end-to-end", () => {
      const route = resolveStudioV3Route({
        feeling: "wine-food",
        companions: "couple",
        rhythm: "immersive",
        interests: ["wine", "gastronomy"],
        pickup: "sesimbra-setubal-arrabida",
        destinationIntent: "arrabida-setubal-azeitao",
        dateExact: MONDAY,
      });
      expect(
        route.routePoints.some((p) => LIVRAMENTO_RE.test(p.label)),
      ).toBe(false);
    });

    it("ignores malformed dateExact (returns the unfiltered pool)", () => {
      const journey = curateJourney("wine-food", "couple", "immersive", {
        interests: ["wine"],
        pickup: "sesimbra-setubal-arrabida",
        destinationIntent: "arrabida-setubal-azeitao",
        dateExact: "not-a-date",
      });
      // Sanity: still curates a real day, no throw.
      expect(journey.moments.length).toBeGreaterThan(0);
    });
  });

  describe("Winery cap (max 3 per day)", () => {
    it("never proposes more than 3 winery-style stops, even for the most wine-led profile", () => {
      const journey = curateJourney("wine-food", "friends", "immersive", {
        interests: ["wine", "gastronomy"],
        pickup: "sesimbra-setubal-arrabida",
        destinationIntent: "arrabida-setubal-azeitao",
        investment: "bespoke",
      });
      const wineryCount = journey.moments.filter((m) =>
        WINE_RE.test(`${m.label} ${m.story}`),
      ).length;
      expect(wineryCount).toBeLessThanOrEqual(3);
    });

    it("Arrábida immersive wine day stays ≤ 3 wineries through resolveStudioV3Route", () => {
      const route = resolveStudioV3Route({
        feeling: "wine-food",
        companions: "friends",
        rhythm: "immersive",
        interests: ["wine", "gastronomy"],
        pickup: "sesimbra-setubal-arrabida",
        destinationIntent: "arrabida-setubal-azeitao",
        investment: "bespoke",
      });
      const wineryCount = route.routePoints.filter((p) =>
        WINE_RE.test(`${p.label} ${p.story}`),
      ).length;
      expect(wineryCount).toBeLessThanOrEqual(3);
    });

    it("Sintra romance day surfaces at most one winery (Adega Regional de Colares)", () => {
      const route = resolveStudioV3Route({
        feeling: "romance",
        companions: "couple",
        rhythm: "balanced",
        interests: ["heritage", "wine"],
        pickup: "sintra",
        destinationIntent: "lisbon-sintra-cascais",
      });
      const wineryCount = route.routePoints.filter((p) =>
        WINE_RE.test(`${p.label} ${p.story}`),
      ).length;
      expect(wineryCount).toBeLessThanOrEqual(1);
    });

    it("Alentejo wine day caps at 2 wineries (regional ceiling)", () => {
      const route = resolveStudioV3Route({
        feeling: "wine-food",
        companions: "couple",
        rhythm: "immersive",
        interests: ["wine", "gastronomy"],
        pickup: "lisbon",
        destinationIntent: "alentejo-evora-wine",
        investment: "bespoke",
      });
      const wineryCount = route.routePoints.filter((p) =>
        WINE_RE.test(`${p.label} ${p.story}`),
      ).length;
      expect(wineryCount).toBeLessThanOrEqual(2);
    });

    it("rejection reason carries region + cap detail for audit", () => {
      const route = resolveStudioV3Route({
        feeling: "romance",
        companions: "couple",
        rhythm: "balanced",
        interests: ["heritage", "wine"],
        pickup: "sintra",
        destinationIntent: "lisbon-sintra-cascais",
      });
      const wineryRejections = (route.audit?.rejections ?? []).filter(
        (r) => r.reason === "winery-cap",
      );
      // If any winery was rejected for cap, the detail must name the region.
      for (const r of wineryRejections) {
        expect(r.detail ?? "").toMatch(/region=/);
        expect(r.detail ?? "").toMatch(/cap=\d+/);
      }
    });
  });
});
