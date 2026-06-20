import { describe, expect, it } from "vitest";
import { resolveStudioV3Route } from "../curation";
import { findTour } from "@/data/signatureTours";
import { REGION_STOP_POOL } from "@/data/regionStopPool";

const WINE_RE =
  /\b(wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca|catralvos|palmela)\b/i;

function norm(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

  it("wine-food feeling alone (no explicit wine interest) still surfaces a wine stop", () => {
    const route = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "couple",
      rhythm: "balanced",
      interests: [],
      pickup: "lisbon",
      destinationIntent: "arrabida-setubal-azeitao",
    });

    expect(route.routePoints.some((p) => WINE_RE.test(`${p.label} ${p.story}`))).toBe(true);
  });

  it("does not repeat stops semantically (Bacalhôa vs Bacalhôa Palace & Winery)", () => {
    const route = resolveStudioV3Route({
      feeling: "wine-food",
      companions: "friends",
      rhythm: "immersive",
      interests: ["wine", "gastronomy", "heritage"],
      pickup: "lisbon",
      investment: "bespoke",
    });
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(
          /\b(winery|wineries|tasting|tastings|adega|adegas|palace|estate|quinta|vineyard|visit|stop|cellar|garden|gardens|museum|workshop|chapel)\b/g,
          "",
        )
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const semantic = route.routePoints.map((p) => normalize(p.label));
    expect(semantic).toEqual(Array.from(new Set(semantic)));

    const tour = route.skeletonTourKey ? findTour(route.skeletonTourKey) : null;
    const allowed = new Set([
      ...(tour?.stops.map((s) => s.label.toLowerCase()) ?? []),
      ...REGION_STOP_POOL.filter((s) => s.active).map((s) => s.name.toLowerCase()),
    ]);
    expect(route.routePoints.every((p) => allowed.has(p.label.toLowerCase()))).toBe(true);
  });
});
