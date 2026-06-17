import { describe, expect, it } from "vitest";
import { validateResolvedSignature } from "../validateReveal";
import type { ResolvedStudioV3Route } from "../curation";
import type { SignatureTour } from "@/data/signatureTours";

const baseResolved: Pick<
  ResolvedStudioV3Route,
  "skeletonTourKey" | "routePoints" | "suggestedRouteLabel" | "journeyTitle"
> = {
  skeletonTourKey: "arrabida-private",
  routePoints: [
    { index: 0, label: "Azeitão", story: "Cellars and cheese.", lat: 38.5, lng: -9 },
    { index: 0, label: "Sesimbra", story: "Fishing-village lunch.", lat: 38.4, lng: -9.1 },
  ],
  suggestedRouteLabel: "Lisbon → Azeitão · Sesimbra → Lisbon",
  journeyTitle: "Your Arrábida day",
};

const baseTour = {
  id: "arrabida-private",
  title: "Arrábida Private",
  img: "/img/arrabida.jpg",
} as Pick<SignatureTour, "id" | "title" | "img">;

describe("validateResolvedSignature", () => {
  it("passes when resolved route + tour are complete", () => {
    const r = validateResolvedSignature(baseResolved, baseTour);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.tourId).toBe("arrabida-private");
  });

  it("flags missing skeleton", () => {
    const r = validateResolvedSignature(
      { ...baseResolved, skeletonTourKey: null },
      null,
    );
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("no-skeleton");
  });

  it("flags empty routePoints", () => {
    const r = validateResolvedSignature(
      { ...baseResolved, routePoints: [] },
      baseTour,
    );
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("no-stops");
  });

  it("flags stop missing label or story", () => {
    const r = validateResolvedSignature(
      {
        ...baseResolved,
        routePoints: [
          { index: 0, label: "", story: "x", lat: null, lng: null },
          { index: 0, label: "Y", story: "  ", lat: null, lng: null },
        ],
      },
      baseTour,
    );
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("stop-missing-label");
    expect(r.missing).toContain("stop-missing-story");
  });

  it("flags tour-not-found when skeleton key set but tour absent", () => {
    const r = validateResolvedSignature(baseResolved, null);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("tour-not-found");
  });

  it("flags tour without image or title", () => {
    const r = validateResolvedSignature(baseResolved, {
      id: "x",
      title: "",
      img: "",
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("tour-missing-image");
    expect(r.missing).toContain("tour-missing-title");
  });

  it("flags missing suggested route + journey title", () => {
    const r = validateResolvedSignature(
      { ...baseResolved, suggestedRouteLabel: "", journeyTitle: "" },
      baseTour,
    );
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("missing-suggested-route");
    expect(r.missing).toContain("missing-journey-title");
  });
});
