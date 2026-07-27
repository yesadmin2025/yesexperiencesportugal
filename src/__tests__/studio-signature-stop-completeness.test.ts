/**
 * Studio + Signature stop completeness — parity coverage guard.
 *
 * Locks the current per-tour parity ratios so the /admin/stop-parity report
 * only ever gets better. The full gap list is browsable on that admin page;
 * this test just prevents silent regressions.
 */

import { describe, expect, it } from "vitest";
import { computeAllTourParity } from "@/lib/stop-parity";

// Minimum non-optional SoT stops that must resolve to a matching YES stop.
// Ratchet up as gaps get closed — never down.
const MIN_MATCHED_STOPS: Record<string, number> = {
  "arrabida-boat": 5,
  "arrabida-wine-allinclusive": 5,
  "azeitao-cheese": 3,
  // 2026-07-27: the canonical Bible content for this Signature is Évora +
  // Alentejo (matching the live site), while CANONICAL_VIATOR_URLS still
  // points at the P6 Setúbal product. External mappings are reported, never
  // silently changed — so the Studio pool has no Évora/Alentejo winery stops
  // yet. Ratchet back to 2+ once those builder_stops rows are added.
  "evora-alentejo": 1,

  "fatima-nazare-obidos": 3,
  "roman-heritage-alentejo": 2,
  "sintra-cascais": 3,
  "southwest-vicentine-coast": 2,
  "tiles-workshop": 2,
  "tomar-coimbra": 2,
  "troia-comporta": 2,
  "wild-beaches-picnic": 2,
};

describe("studio × signature stop completeness", () => {
  const reports = computeAllTourParity().filter((r) => r.hasSot);

  it("SoT coverage exists for at least 10 Signature tours", () => {
    expect(reports.length).toBeGreaterThanOrEqual(10);
  });

  for (const r of reports) {
    it(`${r.tourId} — meets minimum matched stop count`, () => {
      const min = MIN_MATCHED_STOPS[r.tourId] ?? 0;
      expect(
        r.counts.matched,
        `Regression: ${r.tourId} matched ${r.counts.matched}/${r.counts.total} SoT stops (min ${min}). ` +
          `See /admin/stop-parity for the diff.`,
      ).toBeGreaterThanOrEqual(min);
    });
  }
});
