/**
 * Tailor pricing SSOT — stop exclusions and per-pax math.
 *
 * The Tailor's "N stops removed" mechanic must always flow through
 * `tailorAdjustedPerPax` from `src/config/pricing.ts` so the summary,
 * checkout drawer and Stripe line items agree.
 */

import { describe, expect, it } from "vitest";
import {
  DIRECT_DISCOUNT_PCT,
  MAX_TAILOR_REDUCTION_PCT,
  MIN_OPERATIONAL_PCT,
  TAILOR_PRINCIPAL_STEP_PCT,
  directFromPlatform,
  operationalFloor,
  tailorAdjustedPerPax,
} from "@/config/pricing";

describe("tailor pricing SSOT", () => {
  it("direct = round(platform × (1 − 15%))", () => {
    expect(directFromPlatform(100)).toBe(85);
    expect(directFromPlatform(158)).toBe(Math.round(158 * (1 - DIRECT_DISCOUNT_PCT)));
    expect(directFromPlatform(0)).toBe(0);
  });

  it("removing zero stops keeps the direct price", () => {
    expect(tailorAdjustedPerPax(200, 0)).toBe(200);
  });

  it("each principal stop removed drops the per-pax by 5%", () => {
    expect(tailorAdjustedPerPax(200, 1)).toBe(Math.round(200 * (1 - TAILOR_PRINCIPAL_STEP_PCT)));
    expect(tailorAdjustedPerPax(200, 2)).toBe(
      Math.round(200 * (1 - 2 * TAILOR_PRINCIPAL_STEP_PCT)),
    );
  });

  it("cap: no reduction beyond −15% off direct", () => {
    // 4+ stops would notionally exceed the cap; result must equal the cap.
    const capped = Math.round(200 * (1 - MAX_TAILOR_REDUCTION_PCT));
    expect(tailorAdjustedPerPax(200, 4)).toBe(capped);
    expect(tailorAdjustedPerPax(200, 99)).toBe(capped);
  });

  it("never drops below the operational floor", () => {
    const floor = operationalFloor(200);
    expect(floor).toBe(Math.round(200 * MIN_OPERATIONAL_PCT));
    // The floor guards us even if the cap were widened one day.
    expect(tailorAdjustedPerPax(200, 999)).toBeGreaterThanOrEqual(floor);
  });

  it("handles invalid inputs gracefully", () => {
    expect(tailorAdjustedPerPax(0, 3)).toBe(0);
    expect(tailorAdjustedPerPax(Number.NaN, 3)).toBe(0);
    expect(tailorAdjustedPerPax(-50, 3)).toBe(0);
  });
});
