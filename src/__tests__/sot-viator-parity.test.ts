/**
 * SoT ↔ getTourContent parity + locked snapshot.
 *
 * Guarantees every Signature tour's rendered inclusions / not-included /
 * highlights / overview / itinerary chapters exactly match the Source of
 * Truth payload. Any divergence — a UI helper mutating arrays, a legacy
 * fallback leaking in, or an unreviewed edit to
 * `signatureToursSourceOfTruth.ts` — fails CI here.
 *
 * Live Viator fetches are intentionally NOT performed (rate limits +
 * flakiness). Human verification vs. viator.com stays the
 * `/admin/sot-refresh` flow; this suite locks code → rendered parity.
 */

import { describe, expect, it } from "vitest";
import { SIGNATURE_SOURCE_OF_TRUTH } from "@/data/signatureToursSourceOfTruth";
import { getTourContent } from "@/lib/tourContent";

const EXPECTED_SOT_COUNT = 12;
const sotIds = Object.keys(SIGNATURE_SOURCE_OF_TRUTH).sort();

describe("SoT coverage", () => {
  it(`has exactly ${EXPECTED_SOT_COUNT} verified Signature tours`, () => {
    expect(sotIds.length).toBe(EXPECTED_SOT_COUNT);
  });
});

describe("SoT ↔ getTourContent parity", () => {
  it.each(sotIds)("%s: getTourContent output matches SoT payload", (tourId) => {
    const sot = SIGNATURE_SOURCE_OF_TRUTH[tourId];
    const content = getTourContent(tourId);

    expect(content.source).toBe("sot");
    expect(content.overview).toBe(sot.overview);
    expect(content.highlights).toEqual(sot.highlights);
    expect(content.included).toEqual(sot.included);
    expect(content.notIncluded).toEqual(sot.notIncluded);

    expect(content.itinerary).toHaveLength(sot.itinerary.length);
    const sortedSot = sot.itinerary
      .slice()
      .sort((a, b) => a.order - b.order);
    content.itinerary.forEach((chapter, i) => {
      const expected = sortedSot[i];
      expect(chapter.order).toBe(expected.order);
      expect(chapter.label).toBe(expected.label);
      expect(chapter.description).toBe(expected.description);
      expect(chapter.durationMinutes).toBe(expected.durationMinutes);
      expect(chapter.travelToNextMinutes).toBe(expected.travelToNextMinutes);
      expect(chapter.optional).toBe(expected.optional);
    });
  });
});

describe("SoT locked snapshot", () => {
  it.each(sotIds)("%s: rendered content snapshot", (tourId) => {
    const c = getTourContent(tourId);
    expect({
      tourId: c.tourId,
      source: c.source,
      overview: c.overview,
      highlights: c.highlights,
      included: c.included,
      notIncluded: c.notIncluded,
      itinerary: c.itinerary,
    }).toMatchSnapshot();
  });
});
