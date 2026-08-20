import { describe, expect, it } from "vitest";
import {
  buildSnapshotEmailPreview,
  normalizeSnapshotItinerary,
  validateBookingSnapshot,
} from "../booking-snapshot-contract";

const complete = {
  experienceName: "Private Sintra & Cascais Tour",
  dateExact: "2026-09-04",
  itinerary: [
    { order: 1, label: "Pena Palace", durationMinutes: 90 },
    { label: "Quinta da Regaleira", durationMinutes: 75, note: "skip-the-line" },
  ],
  includedItems: ["Private driver-guide", "  "],
  addOns: [{ label: "Private photographer", priceEur: 120 }, { label: "Picnic" }],
  removedOptions: ["Included lunch removed"],
  notes: ["Dietary: one vegetarian"],
  composition: { guests: 2 },
  pricing: { totalEur: 690 },
};

describe("booking snapshot contract", () => {
  it("normalizes stops and backfills order", () => {
    const stops = normalizeSnapshotItinerary(complete.itinerary);
    expect(stops.map((s) => s.order)).toEqual([1, 2]);
    expect(stops[1].note).toBe("skip-the-line");
  });

  it("formats email preview lines exactly as the templates render them", () => {
    const preview = buildSnapshotEmailPreview(complete);
    expect(preview.itineraryLines).toEqual([
      "1. Pena Palace · 90 min",
      "2. Quinta da Regaleira · 75 min — skip-the-line",
    ]);
    expect(preview.includedItems).toEqual(["Private driver-guide"]);
    expect(preview.addOnLabels).toEqual(["Private photographer · €120 pp", "Picnic"]);
    expect(preview.customerNotes).toEqual(["Dietary: one vegetarian"]);
  });

  it("accepts a complete snapshot", () => {
    expect(validateBookingSnapshot(complete)).toEqual({ ok: true, missing: [] });
  });

  it("reports every field an email would be missing", () => {
    const result = validateBookingSnapshot({ itinerary: [], composition: {}, pricing: {} });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      "experience name",
      "date",
      "itinerary stops",
      "guest count",
      "total price",
    ]);
  });

  it("treats a missing snapshot as incomplete", () => {
    expect(validateBookingSnapshot(null)).toEqual({ ok: false, missing: ["snapshot"] });
  });
});
