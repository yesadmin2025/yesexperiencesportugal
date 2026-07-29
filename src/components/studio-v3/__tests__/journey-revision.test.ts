import { describe, it, expect } from "vitest";
import { buildJourneyRevision } from "../signatureStorySnapshot";
import type { StudioV3State } from "../types";

/**
 * E6 — revision hash is the idempotency seed for the Signature Story
 * email. It MUST be stable across calls with identical inputs and MUST
 * change whenever a fact the traveller sees on Storytelling / Summary /
 * Stripe changes (composition, add-ons, date, pickup, route).
 */

function baseState(overrides: Partial<StudioV3State> = {}): StudioV3State {
  return {
    phase: "guests",
    feeling: "coastal",
    companions: "couple",
    rhythm: "balanced",
    interests: [],
    pickup: "lisbon",
    occasion: "none",
    considerations: [],
    investment: null,
    destinationIntent: null,
    dateWindow: "exact",
    dateExact: "2026-08-14",
    guests: 2,
    adults: 2,
    minorAges: [],
    tourId: "arrabida-signature",
    editedRoutePoints: null,
    journeyTitle: null,
    guestDraft: null,
    ...overrides,
  } as StudioV3State;
}

describe("buildJourneyRevision", () => {
  it("is deterministic for identical inputs", () => {
    const s = baseState();
    const a = buildJourneyRevision(s, { adults: 2, minorAges: [], addOnIds: ["sunset"] });
    const b = buildJourneyRevision(s, { adults: 2, minorAges: [], addOnIds: ["sunset"] });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-z0-9]{1,12}$/);
  });

  it("changes when composition changes (adults or minor ages)", () => {
    const s = baseState();
    const twoAdults = buildJourneyRevision(s, { adults: 2, minorAges: [] });
    const twoAdultsPlusChild = buildJourneyRevision(s, { adults: 2, minorAges: [8] });
    const threeAdults = buildJourneyRevision(s, { adults: 3, minorAges: [] });
    expect(twoAdults).not.toBe(twoAdultsPlusChild);
    expect(twoAdults).not.toBe(threeAdults);
    expect(twoAdultsPlusChild).not.toBe(threeAdults);
  });

  it("is order-insensitive for add-ons and minor ages", () => {
    const s = baseState();
    const a = buildJourneyRevision(s, {
      adults: 2,
      minorAges: [5, 12],
      addOnIds: ["a", "b", "c"],
    });
    const b = buildJourneyRevision(s, {
      adults: 2,
      minorAges: [12, 5],
      addOnIds: ["c", "a", "b"],
    });
    expect(a).toBe(b);
  });

  it("changes when add-ons, date, pickup, or route change", () => {
    const base = buildJourneyRevision(baseState(), { adults: 2, minorAges: [] });
    const withAddOn = buildJourneyRevision(baseState(), {
      adults: 2,
      minorAges: [],
      addOnIds: ["sunset"],
    });
    const otherDate = buildJourneyRevision(baseState({ dateExact: "2026-08-15" }), {
      adults: 2,
      minorAges: [],
    });
    const otherPickup = buildJourneyRevision(baseState({ pickup: "sintra" }), {
      adults: 2,
      minorAges: [],
    });
    const otherRoute = buildJourneyRevision(
      baseState({
        editedRoutePoints: [
          {
            label: "New Stop",
            story: "x",
            index: 0,
          } as unknown as StudioV3State["editedRoutePoints"] extends (infer U)[] | null ? U : never,
        ] as StudioV3State["editedRoutePoints"],
      }),
      { adults: 2, minorAges: [] },
    );
    const all = new Set([base, withAddOn, otherDate, otherPickup, otherRoute]);
    expect(all.size).toBe(5);
  });
});
