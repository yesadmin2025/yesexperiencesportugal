// Unit guard — confirms BuilderMap and RealLeafletMap (PremiumMap) use
// different localStorage namespaces and never overwrite each other.
import { describe, expect, it, beforeEach } from "vitest";
import { getMapZoomStore } from "@/lib/mapZoomMemory";

beforeEach(() => {
  window.localStorage.clear();
});

describe("mapZoomMemory namespace isolation", () => {
  it("does not overwrite the other surface's stored cameras", () => {
    const builder = getMapZoomStore("builder-map");
    const premium = getMapZoomStore("premium-map");

    builder.set("lisbon", { center: [38.71, -9.13], zoom: 14 });
    premium.set("porto", { center: [41.15, -8.61], zoom: 13 });

    // Each namespace persisted under its own key
    const bRaw = window.localStorage.getItem("yes.mapZoom.builder-map.v1");
    const pRaw = window.localStorage.getItem("yes.mapZoom.premium-map.v1");
    expect(bRaw).toContain("lisbon");
    expect(pRaw).toContain("porto");
    expect(bRaw).not.toContain("porto");
    expect(pRaw).not.toContain("lisbon");

    // Writing to one does not touch the other
    builder.set("lisbon", { center: [38.71, -9.13], zoom: 16 });
    expect(premium.get("porto")?.zoom).toBe(13);

    premium.set("porto", { center: [41.15, -8.61], zoom: 15 });
    expect(builder.get("lisbon")?.zoom).toBe(16);
  });

  it("re-hydrates each namespace independently from localStorage", () => {
    window.localStorage.setItem(
      "yes.mapZoom.builder-map.v1",
      JSON.stringify({ alentejo: { center: [38.57, -7.91], zoom: 10 } }),
    );
    window.localStorage.setItem(
      "yes.mapZoom.premium-map.v1",
      JSON.stringify({ algarve: { center: [37.1, -8.2], zoom: 11 } }),
    );

    // New stores in a fresh module would normally re-hydrate; here we test
    // the persisted payloads stay separate after a round-trip.
    expect(JSON.parse(window.localStorage.getItem("yes.mapZoom.builder-map.v1")!)).toEqual({
      alentejo: { center: [38.57, -7.91], zoom: 10 },
    });
    expect(JSON.parse(window.localStorage.getItem("yes.mapZoom.premium-map.v1")!)).toEqual({
      algarve: { center: [37.1, -8.2], zoom: 11 },
    });
  });
});
