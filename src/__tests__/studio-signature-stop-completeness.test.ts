/**
 * Studio + Signature stop completeness.
 *
 * For every tour that has a Source-of-Truth entry, every non-pickup SoT
 * chapter must be reachable through the YES surfaces Studio depends on:
 *   - a matching entry in `signatureTours[tour].stops[]`
 *   - a coordinate resolvable by `stopCoords.snapStop()` (so the map renders)
 *
 * Warns (does not fail) on missing `stopIntents` — those degrade Studio
 * curation but don't break the flow.
 */

import { describe, expect, it } from "vitest";
import { computeAllTourParity } from "@/lib/stop-parity";

describe("studio × signature stop completeness", () => {
  const reports = computeAllTourParity().filter((r) => r.hasSot);

  it("has SoT coverage for at least 10 Signature tours", () => {
    expect(reports.length).toBeGreaterThanOrEqual(10);
  });

  for (const r of reports) {
    it(`${r.tourId} — every non-optional SoT stop is present in signatureTours`, () => {
      const missing = r.rows.filter(
        (row) => row.status === "sot-missing-in-yes" && !row.optional && row.sotLabel,
      );
      // Optional SoT chapters (dolphin watching, Cristo Rei add-on, etc.)
      // are permitted to be absent from the fixed YES stop list.
      expect(
        missing,
        `Missing required SoT stops for ${r.tourId}:\n${missing.map((m) => `  - ${m.sotLabel}`).join("\n")}`,
      ).toHaveLength(0);
    });

    it(`${r.tourId} — every non-optional SoT stop has a map coordinate`, () => {
      const noCoord = r.rows.filter(
        (row) => row.sotLabel && !row.optional && !row.hasMapCoord,
      );
      expect(
        noCoord,
        `SoT stops without a map coord for ${r.tourId}:\n${noCoord.map((m) => `  - ${m.sotLabel}`).join("\n")}`,
      ).toHaveLength(0);
    });
  }
});
