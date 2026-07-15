import { describe, it, expect } from "vitest";
import {
  ADD_ON_CATALOG,
  deriveTimeOfDay,
  deriveAnchorStop,
  deriveMaxGuests,
  selectSignatureAddOns,
  type SignatureAddOn,
} from "@/data/signatureAddOns";


const arrabidaTour = {
  id: "arrabida-wine-allinclusive",
  region: "Arrábida",
  included: ["Private transport", "Guide"],
} as const;

describe("E3 add-on compatibility fields", () => {
  it("derives midday for picnic/boat/tasting", () => {
    const picnic = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "hidden-cove-picnic")!;
    const boat = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "coastal-boat-ride")!;
    expect(deriveTimeOfDay(picnic)).toBe("midday");
    expect(deriveTimeOfDay(boat)).toBe("midday");
  });

  it("derives afternoon for cliffs/detour/walls", () => {
    const sintra = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "sintra-detour")!;
    const walls = ADD_ON_CATALOG.centro.find((a) => a.id === "obidos-walls")!;
    expect(deriveTimeOfDay(sintra)).toBe("afternoon");
    expect(deriveTimeOfDay(walls)).toBe("afternoon");
  });

  it("prefers explicit timeOfDay over heuristic", () => {
    const a: SignatureAddOn = {
      ...ADD_ON_CATALOG["lisbon-arrabida"][0],
      timeOfDay: "morning",
    };
    expect(deriveTimeOfDay(a)).toBe("morning");
  });

  it("anchor stop falls back to sourceTourId when unset", () => {
    const a = ADD_ON_CATALOG["lisbon-arrabida"][0];
    const anchor = deriveAnchorStop(a);
    expect(anchor.stopKey).toBeNull();
    expect(anchor.sourceTourId).toBe(a.sourceTourId);
  });

  it("selector drops add-ons whose maxGuests is below the party size", () => {
    const original = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "azulejo-workshop")!;
    original.maxGuests = 4;
    try {
      const picksSmall = selectSignatureAddOns({
        resolvedTour: arrabidaTour,
        stopCount: 5,
        durationLabel: "8h",
        guests: 2,
      });
      const picksLarge = selectSignatureAddOns({
        resolvedTour: arrabidaTour,
        stopCount: 5,
        durationLabel: "8h",
        guests: 8,
      });
      expect(picksSmall.some((a) => a.id === "azulejo-workshop")).toBe(true);
      expect(picksLarge.some((a) => a.id === "azulejo-workshop")).toBe(false);
    } finally {
      delete original.maxGuests;
    }
  });

  it("selector de-duplicates time-of-day slots (keeps first per slot)", () => {
    // Two Arrábida midday add-ons exist: hidden-cove-picnic and coastal-boat-ride.
    // Both are "midday" → only the first must survive.
    const picks = selectSignatureAddOns({
      resolvedTour: arrabidaTour,
      stopCount: 5,
      durationLabel: "8h",
    });
    const middayCount = picks.filter((a) => deriveTimeOfDay(a) === "midday").length;
    expect(middayCount).toBeLessThanOrEqual(1);
  });

  it("derives maxGuests conservatively from add-on nature", () => {
    const workshop = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "azulejo-workshop")!;
    const boat = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "coastal-boat-ride")!;
    const picnic = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "hidden-cove-picnic")!;
    const detour = ADD_ON_CATALOG["lisbon-arrabida"].find((a) => a.id === "sintra-detour")!;
    expect(deriveMaxGuests(workshop)).toBe(8);
    expect(deriveMaxGuests(boat)).toBe(12);
    expect(deriveMaxGuests(picnic)).toBe(10);
    expect(deriveMaxGuests(detour)).toBeUndefined();
  });

  it("selector honors derived cap when explicit maxGuests is unset", () => {
    // Workshop derived cap = 8; party of 10 must drop it, party of 6 keeps it.
    const picksSmall = selectSignatureAddOns({
      resolvedTour: arrabidaTour,
      stopCount: 5,
      durationLabel: "8h",
      guests: 6,
    });
    const picksLarge = selectSignatureAddOns({
      resolvedTour: arrabidaTour,
      stopCount: 5,
      durationLabel: "8h",
      guests: 10,
    });
    expect(picksSmall.some((a) => a.id === "azulejo-workshop")).toBe(true);
    expect(picksLarge.some((a) => a.id === "azulejo-workshop")).toBe(false);
  });
});

