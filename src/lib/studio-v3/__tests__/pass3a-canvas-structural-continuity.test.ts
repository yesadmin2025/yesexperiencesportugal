/**
 * PASS 3A — structural media continuity, Canvas → YOUR DAY.
 *
 * Media identity follows the STRUCTURAL stop identity, never the display
 * label. These proofs are unconditional: no `if (...) expect`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { deriveLivingCanvas, type LivingCanvasPoint } from "@/lib/studio-v3/livingCanvasModel";
import { resolveAuthoritativeRouteStops } from "@/components/studio-v3/studioRouteAuthority";
import {
  resolveYourDayVisuals,
  yourDayMediaFor,
} from "@/lib/studio-v3/yourDayCanvasContinuity";

const point = (over: Partial<LivingCanvasPoint> & { label: string }): LivingCanvasPoint => ({
  story: "A real moment.",
  lat: 38.5,
  lng: -9.0,
  ...over,
});

const canvasOf = (points: LivingCanvasPoint[], stopImages?: Record<string, { id: string; src: string; alt: string } | null>) =>
  deriveLivingCanvas({
    feeling: "wine-food",
    interests: ["wine"],
    shaped: true,
    stopImages,
    composition: { regionLabel: "Arrábida", points },
  });

const A = point({
  label: "Cellar in Azeitão",
  stopId: "inv-a",
  image: "/img/a.jpg",
  imageAlt: "A cellar.",
  focal: "50% 40%",
});
const B = point({ label: "Coastal cove", stopId: "inv-b", image: "/img/b.jpg", imageAlt: "A cove." });

describe("PASS 3A — canvas media follows structural identity", () => {
  it("A · same structural id + new display label keeps the same media identity", () => {
    const before = canvasOf([A]);
    const after = canvasOf([{ ...A, label: "Adega da família" }]);
    expect(before.moments[0].image.id).toBe("stop:inv-a");
    expect(after.moments[0].image.id).toBe("stop:inv-a");
    expect(after.moments[0].image.src).toBe(before.moments[0].image.src);
  });

  it("B · two different structural ids sharing one label never collide", () => {
    const model = canvasOf([
      point({ label: "Viewpoint", stopId: "inv-1", image: "/img/1.jpg" }),
      point({ label: "Viewpoint", stopId: "inv-2", image: "/img/2.jpg" }),
    ]);
    expect(model.moments.map((m) => m.id)).toEqual(["moment:inv-1", "moment:inv-2"]);
    expect(model.moments[0].image.src).toBe("/img/1.jpg");
    expect(model.moments[1].image.src).toBe("/img/2.jpg");
  });

  it("C · swap A→B drops A's visual and resolves B's own", () => {
    const model = canvasOf([A, B]);
    const swapped = resolveYourDayVisuals(model, [
      { label: A.label, stopId: "inv-a" },
      { label: "Renamed cove", stopId: "inv-b" },
    ]);
    expect(yourDayMediaFor(swapped, { label: "x", stopId: "inv-b" })?.src).toBe("/img/b.jpg");

    const afterSwap = resolveYourDayVisuals(model, [
      { label: A.label, stopId: "inv-a" },
      { label: "Other stop", stopId: "inv-z" },
    ]);
    expect(yourDayMediaFor(afterSwap, { label: "Other stop", stopId: "inv-z" })).toBeNull();
    expect(afterSwap.byId.has("inv-b")).toBe(false);
  });

  it("D · removing A removes A; reordering preserves media by id", () => {
    const model = canvasOf([A, B]);
    const removed = resolveYourDayVisuals(model, [{ label: B.label, stopId: "inv-b" }]);
    expect(removed.byId.has("inv-a")).toBe(false);
    expect(removed.byId.get("inv-b")?.src).toBe("/img/b.jpg");

    const reordered = resolveYourDayVisuals(model, [
      { label: B.label, stopId: "inv-b" },
      { label: A.label, stopId: "inv-a" },
    ]);
    expect(yourDayMediaFor(reordered, { label: A.label, stopId: "inv-a" })?.src).toBe("/img/a.jpg");
    expect(yourDayMediaFor(reordered, { label: B.label, stopId: "inv-b" })?.src).toBe("/img/b.jpg");
  });

  it("E · a structural point without inline media never borrows a label image", () => {
    const model = canvasOf([point({ label: "Cellar in Azeitão", stopId: "inv-c" })], {
      "cellar in azeitão": { id: "legacy", src: "/img/legacy.jpg", alt: "Legacy." },
    });
    expect(model.moments[0].image.src).not.toBe("/img/legacy.jpg");
    expect(model.moments[0].image.source).not.toBe("stop");
  });

  it("F · a legacy Signature point with real inline image + focal reaches the canvas", () => {
    const model = canvasOf([A]);
    expect(model.moments[0].image.src).toBe("/img/a.jpg");
    expect(model.moments[0].image.focal).toBe("50% 40%");
    expect(model.moments[0].image.alt).toBe("A cellar.");
  });

  it("G · focal survives in StudioMedia and both crossfade frames use their own focal", () => {
    const model = canvasOf([A]);
    expect(model.backdrop.focal).toBe("50% 40%");
    const source = readFileSync(
      resolve(process.cwd(), "src/components/studio-v3/LivingCanvas.tsx"),
      "utf8",
    );
    expect(source).toContain("previous.focal ? { objectPosition: previous.focal }");
    expect(source).toContain("shown.focal ? { objectPosition: shown.focal }");
  });

  it("H · moment identity and fingerprint ignore a display-label change", () => {
    const before = canvasOf([A, B]);
    const after = canvasOf([{ ...A, label: "Totally different name" }, B]);
    expect(after.moments.map((m) => m.id)).toEqual(before.moments.map((m) => m.id));
    expect(after.fingerprint).toBe(before.fingerprint);
  });

  it("I · identity-less legacy points use only the migration fallback / generic media", () => {
    const model = canvasOf([point({ label: "Old stop" })], {
      "old stop": { id: "legacy", src: "/img/legacy.jpg", alt: "Legacy." },
    });
    expect(model.moments[0].stopId).toBeNull();
    expect(model.moments[0].image.src).toBe("/img/legacy.jpg");

    const visuals = resolveYourDayVisuals(model, [{ label: "Old stop" }]);
    expect(visuals.byId.size).toBe(0);
    expect(yourDayMediaFor(visuals, { label: "Old stop" })?.src).toBe("/img/legacy.jpg");
    expect(yourDayMediaFor(visuals, "Old stop")?.src).toBe("/img/legacy.jpg");

    const generic = canvasOf([point({ label: "Unknown stop" })]);
    expect(generic.moments[0].image.source).not.toBe("stop");
    expect(generic.moments[0].image.src.length).toBeGreaterThan(0);
  });
});

describe("PASS 3A.1 — Canvas reads the CURRENT authoritative route", () => {
  const suggested = [
    { label: "Cellar in Azeitão", story: "", inventoryStopId: "inv-a", image: "/img/a.jpg", focal: "50% 40%", lat: 38.52, lng: -9.01 },
    { label: "Coastal cove", story: "", inventoryStopId: "inv-b", image: "/img/b.jpg", lat: 38.47, lng: -8.99 },
  ];
  const edited = [
    { label: "Coastal cove", story: "", inventoryStopId: "inv-b", image: "/img/b.jpg", lat: 38.47, lng: -8.99 },
    { label: "Palmela castle", story: "", inventoryStopId: "inv-c", image: "/img/c.jpg", focal: "50% 30%", lat: 38.57, lng: -8.9 },
  ];

  it("K · editedRoutePoints beat the fresh resolveStudioV3Route result (swap/add/reorder in one edit)", () => {
    const selected = resolveAuthoritativeRouteStops({
      editedRoutePoints: edited,
      resolved: { composedRoutePoints: suggested, routePoints: suggested },
      catalogStops: null,
    });
    // Order follows the edited route, membership follows the edited route.
    expect(selected.map((s) => s.inventoryStopId)).toEqual(["inv-b", "inv-c"]);
    expect(selected.some((s) => s.inventoryStopId === "inv-a")).toBe(false);
    // Inline verified media travels with the structural id.
    expect(selected[1].image).toBe("/img/c.jpg");
    expect(selected[1].focal).toBe("50% 30%");
    // PASS 3A.2 — real operational geography survives the authority chain.
    expect(selected[0].lat).toBe(38.47);
    expect(selected[0].lng).toBe(-8.99);
    expect(selected[1].lat).toBe(38.57);
    expect(selected[1].lng).toBe(-8.9);
  });

  it("L · editedRoutePoints = null returns the resolved suggested route unchanged", () => {
    const selected = resolveAuthoritativeRouteStops({
      editedRoutePoints: null,
      resolved: { composedRoutePoints: suggested, routePoints: [] },
      catalogStops: null,
    });
    expect(selected.map((s) => s.inventoryStopId)).toEqual(["inv-a", "inv-b"]);
    // PASS 3A.2 — the resolved suggested route keeps its real lat/lng.
    expect(selected[0].lat).toBe(38.52);
    expect(selected[0].lng).toBe(-9.01);
    expect(selected[1].lat).toBe(38.47);
    expect(selected[1].lng).toBe(-8.99);
  });

  it("L2 · a point that never knew coordinates stays null — never invented", () => {
    const selected = resolveAuthoritativeRouteStops({
      editedRoutePoints: [{ label: "Skeleton stop", story: "", inventoryStopId: "inv-s" }],
      resolved: null,
      catalogStops: null,
    });
    expect(selected[0].lat).toBeNull();
    expect(selected[0].lng).toBeNull();
  });

  it("M · the liveComposition seam in StudioV3 uses the authority chain + structural ids (source contract)", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
      "utf8",
    );
    const seam = source.slice(source.indexOf("const liveComposition = useMemo"));
    expect(seam.indexOf("resolveAuthoritativeRouteStops")).toBeLessThan(
      seam.indexOf("if (points.length === 0) return null;"),
    );
    expect(seam).toContain("editedRoutePoints: state.editedRoutePoints ?? null");
    expect(seam).toContain("stopId: point.inventoryStopId ?? point.blueprintStopId ?? null");
    expect(seam).toContain("state.editedRoutePoints,");
    expect(seam).not.toContain("resolvedLive.composedRoutePoints.length\n      ? resolvedLive.composedRoutePoints");
    // PASS 3A.2 — real coordinates flow through; no forced nulls.
    expect(seam).toContain("lat: point.lat ?? null");
    expect(seam).toContain("lng: point.lng ?? null");
    expect(seam).not.toContain("lat: null,");
    expect(seam).not.toContain("lng: null,");
  });
});
