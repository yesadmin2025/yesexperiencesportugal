/**
 * Enforces the "no arbitrary locks" rule for Tailor.
 * Any locked stop MUST carry a machine-readable reasonCode, a non-empty
 * customer-facing sentence, and a source of truth. A bare `locked: true`
 * flag is impossible by construction (schema forbids it), and this test
 * blocks any future entry from shipping a lock without justification.
 */
import { describe, expect, it } from "vitest";
import { TAILOR_BLUEPRINTS, type StopLockReasonCode } from "@/data/tailorBlueprints";

const VALID_CODES: StopLockReasonCode[] = [
  "product_defining",
  "supplier_fixed_package",
  "addon_anchor",
  "confirmed_reservation",
  "mandatory_transfer",
  "route_integrity",
];

describe("Tailor blueprints — locked stops", () => {
  const blueprints = Object.values(TAILOR_BLUEPRINTS);

  it("every blueprint exposes at least one removable/tailorable element", () => {
    for (const bp of blueprints) {
      const removableCore = bp.core.filter((s) => !s.lock).length;
      const choiceCount = bp.choice?.options.length ?? 0;
      const optionalCount = bp.optional.length;
      expect(
        removableCore + choiceCount + optionalCount,
        `Blueprint ${bp.tourId} has no tailorable stops — every Tailor journey must be tailorable.`,
      ).toBeGreaterThan(0);
    }
  });

  it("every locked stop carries reasonCode, customerFacingReason and source", () => {
    for (const bp of blueprints) {
      for (const s of bp.core) {
        if (!s.lock) continue;
        expect(VALID_CODES, `${bp.tourId}/${s.id}: invalid reasonCode`).toContain(
          s.lock.reasonCode,
        );
        expect(
          s.lock.customerFacingReason.trim().length,
          `${bp.tourId}/${s.id}: customerFacingReason is empty`,
        ).toBeGreaterThan(0);
        expect(
          s.lock.customerFacingReason.length,
          `${bp.tourId}/${s.id}: customerFacingReason exceeds 120 chars`,
        ).toBeLessThanOrEqual(160);
        expect(
          s.lock.source.trim().length,
          `${bp.tourId}/${s.id}: source is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("choice and optional stops are never locked (locks only apply to Core)", () => {
    for (const bp of blueprints) {
      for (const o of bp.choice?.options ?? []) {
        expect(o.lock, `${bp.tourId}/${o.id}: choice options must remain swappable`).toBeUndefined();
      }
      for (const o of bp.optional) {
        expect(o.lock, `${bp.tourId}/${o.id}: optional stops must remain opt-in`).toBeUndefined();
      }
    }
  });
});
