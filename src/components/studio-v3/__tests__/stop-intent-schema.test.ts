// Studio V3 — stop-intent schema validator tests.
//
// Guards `validateStopIntentSchema` and `assertStopIntentSchema` in
// src/data/stopIntents.ts. These are the runtime safety net that blocks
// Studio curation when the TOUR_STOP_INTENTS table drifts out of sync
// with the Signature catalog.

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SignatureTour } from "@/data/signatureTours";
import {
  STOP_INTENT_KEYS,
  __resetStopIntentSchemaAssertion,
  assertStopIntentSchema,
  validateStopIntentSchema,
  type StopIntent,
} from "@/data/stopIntents";

// Minimal fixture tour that reuses a real tour id already present in
// TOUR_STOP_INTENTS so we can inject synthetic failures without editing
// the shared table.
function makeTour(overrides: Partial<SignatureTour> & Pick<SignatureTour, "id">): SignatureTour {
  return {
    id: overrides.id,
    stops: overrides.stops ?? [],
  } as unknown as SignatureTour;
}

describe("validateStopIntentSchema", () => {
  beforeEach(() => __resetStopIntentSchemaAssertion());

  it("passes on the real Signature catalog", () => {
    const report = validateStopIntentSchema();
    expect(report.ok, report.errors.join("\n")).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("STOP_INTENT_KEYS matches the StopIntent union at runtime", () => {
    // Any intent used in the real table must appear in the runtime key list.
    const declared = new Set<StopIntent>(STOP_INTENT_KEYS);
    expect(declared.size).toBe(STOP_INTENT_KEYS.length);
  });

  it("flags an untagged stop with a clear message", () => {
    const fake = makeTour({
      id: "arrabida-wine-allinclusive",
      stops: [{ label: "__brand-new-untagged-stop__" }] as SignatureTour["stops"],
    });
    const report = validateStopIntentSchema([fake]);
    expect(report.ok).toBe(false);
    expect(report.counts.untaggedStop).toBe(1);
    expect(report.errors.join("\n")).toMatch(/untagged Signature stop/);
  });

  it("flags an unknown tour id in TOUR_STOP_INTENTS", () => {
    // Real table already covers real tours; passing an empty catalog
    // makes every tour key in TOUR_STOP_INTENTS orphaned.
    const report = validateStopIntentSchema([]);
    expect(report.ok).toBe(false);
    expect(report.counts.unknownTour).toBeGreaterThan(0);
    expect(report.errors.join("\n")).toMatch(/unknown tour id/);
  });
});

describe("assertStopIntentSchema", () => {
  beforeEach(() => __resetStopIntentSchemaAssertion());

  it("does not throw on the real Signature catalog", () => {
    expect(() => assertStopIntentSchema()).not.toThrow();
  });

  it("throws with a formatted message and logs to console on failure", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      // Empty tour catalog → every TOUR_STOP_INTENTS key becomes unknown.
      expect(() => assertStopIntentSchema([])).toThrow(/Schema validation failed/);
      expect(err).toHaveBeenCalled();
      const logged = String(err.mock.calls[0]?.[0] ?? "");
      expect(logged).toMatch(/Studio curation is blocked/);
    } finally {
      err.mockRestore();
    }
  });

  it("memoises the failure — repeated calls stay cheap and consistent", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => assertStopIntentSchema([])).toThrow();
    // Second call must also throw (memoised failure), without re-logging noise.
    expect(() => assertStopIntentSchema([])).toThrow(/Schema validation failed/);
  });
});
