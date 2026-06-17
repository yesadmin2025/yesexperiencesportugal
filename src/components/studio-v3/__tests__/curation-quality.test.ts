import { describe, expect, it } from "vitest";
import { resolveStudioV3Route } from "../curation";
import { findTour } from "@/data/signatureTours";

const WINE_RE = /\b(wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca|catralvos|palmela)\b/i;

function norm(label: string) {
  return label.trim().toLowerCase();
}

describe("Studio V3 curation quality", () => {
  it("wine interest resolves at least one real winery/tasting stop", () => {
    const route = resolveStudioV3Route({
      feeling: "hidden",
      companions: "couple",
      rhythm: "balanced",
      interests: ["wine"],
      pickup: "lisbon",
      destinationIntent: "arrabida-setubal-azeitao",
    });

    expect(route.routePoints.some((p) => WINE_RE.test(`${p.label} ${p.story}`))).toBe(true);
  });

  it("does not repeat stops and keeps them inside the resolved Signature", () => {
    const route = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "friends",
      rhythm: "immersive",
      interests: ["wine", "gastronomy", "heritage"],
      pickup: "lisbon",
      investment: "bespoke",
    });
    const labels = route.routePoints.map((p) => norm(p.label));
    const tour = route.skeletonTourKey ? findTour(route.skeletonTourKey) : null;
    const allowed = new Set(tour?.stops.map((s) => norm(s.label)) ?? []);

    expect(labels).toEqual(Array.from(new Set(labels)));
    expect(labels.every((label) => allowed.has(label))).toBe(true);
  });
});