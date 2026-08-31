import { describe, expect, it } from "vitest";

import {
  certifyDoorToDoor,
  certifyDoorToDoorAdmission,
  doorToDoorAllowsCheckout,
  transferMinutes,
} from "@/lib/studio-v3/doorToDoorAuthority";
import { resolveTimeBudget } from "@/lib/studio-v3/resolveTimeBudget";
import {
  STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN,
  STUDIO_DOOR_TO_DOOR_TARGET_MIN_MIN,
} from "@/lib/studio-v3/timeDomain";
import type { TimeAuthorityStop } from "@/lib/studio-v3/timeAuthority";

const LISBON = { lat: 38.7223, lng: -9.1393 };
const SETUBAL = { lat: 38.5244, lng: -8.8882 };
const VICENTINE = { lat: 37.1, lng: -8.8 };

function stop(id: string, minutes: number, coord: { lat: number; lng: number }): TimeAuthorityStop {
  return {
    stopId: id,
    durationMinutes: minutes,
    durationSource: "inventory",
    lat: coord.lat,
    lng: coord.lng,
  };
}

const ARRABIDA_DAY: TimeAuthorityStop[] = [
  stop("azeitao-table", 90, { lat: 38.5157, lng: -9.0128 }),
  stop("arrabida-viewpoint", 45, { lat: 38.4772, lng: -9.0138 }),
  stop("sesimbra-harbour", 60, { lat: 38.4425, lng: -9.1017 }),
];

describe("door-to-door authority — canonical formula", () => {
  it("accounts pickup→first and last→drop-off as first-class cost", () => {
    const cert = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: LISBON });
    expect(cert.evaluable).toBe(true);
    expect(cert.pickupToFirstMinutes).toBeGreaterThan(0);
    expect(cert.lastToDropoffMinutes).toBeGreaterThan(0);
    // Formula parity: the reported parts sum exactly to the total.
    expect(
      cert.pickupToFirstMinutes +
        cert.experienceMinutes +
        cert.internalTravelMinutes +
        cert.slackMinutes +
        cert.lastToDropoffMinutes,
    ).toBe(cert.doorToDoorMinutes);
  });

  it("defaults drop-off to the pickup zone", () => {
    const a = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: LISBON });
    const b = certifyDoorToDoor({
      stops: ARRABIDA_DAY,
      pickupCoord: LISBON,
      dropoffCoord: LISBON,
    });
    expect(a.doorToDoorMinutes).toBe(b.doorToDoorMinutes);
  });

  it("a different pickup changes the available experience capacity", () => {
    const fromLisbon = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: LISBON });
    const fromSetubal = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: SETUBAL });
    expect(fromSetubal.doorToDoorMinutes).toBeLessThan(fromLisbon.doorToDoorMinutes);
    expect(fromSetubal.remainingToHardMaxMinutes).toBeGreaterThan(
      fromLisbon.remainingToHardMaxMinutes,
    );
  });

  it("honours the 540 hard max and the 480 target floor", () => {
    const cert = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: LISBON });
    expect(cert.hardMaxMinutes).toBe(540);
    expect(cert.targetMinMinutes).toBe(480);
    expect(cert.doorToDoorMinutes).toBeLessThanOrEqual(STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN);
    expect(cert.status).toBe(
      cert.doorToDoorMinutes < STUDIO_DOOR_TO_DOOR_TARGET_MIN_MIN ? "underfilled-but-valid" : "fits",
    );
  });

  it("a short coherent day is valid, never invalid for being under 480", () => {
    const cert = certifyDoorToDoor({
      stops: [stop("sesimbra-harbour", 60, { lat: 38.4425, lng: -9.1017 })],
      pickupCoord: SETUBAL,
    });
    expect(cert.status).toBe("underfilled-but-valid");
    expect(doorToDoorAllowsCheckout(cert)).toBe(true);
  });

  it("a far corridor from Lisbon fails the 9h ceiling instead of being widened", () => {
    const cert = certifyDoorToDoor({
      stops: [
        stop("vicentine-a", 120, VICENTINE),
        stop("vicentine-b", 90, { lat: 37.2, lng: -8.75 }),
      ],
      pickupCoord: LISBON,
    });
    expect(cert.status).toBe("over-hard-max");
    expect(cert.overflowMinutes).toBeGreaterThan(0);
    expect(doorToDoorAllowsCheckout(cert)).toBe(false);
    expect(cert.reason).toMatch(/9-hour/);
  });
});

describe("door-to-door authority — fail closed", () => {
  it("is not evaluable without a pickup origin", () => {
    const cert = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: null });
    expect(cert.status).toBe("not-evaluable");
    expect(doorToDoorAllowsCheckout(cert)).toBe(false);
  });

  it("is not evaluable when a moment has no verified duration", () => {
    const cert = certifyDoorToDoor({
      stops: [{ stopId: "unknown-dwell", lat: 38.5, lng: -9 }],
      pickupCoord: LISBON,
    });
    expect(cert.status).toBe("not-evaluable");
  });

  it("never treats missing geo as zero transfer minutes", () => {
    expect(transferMinutes(null, LISBON)).toBeGreaterThan(0);
    expect(transferMinutes(LISBON, null)).toBeGreaterThan(0);
  });

  it("selected add-on minutes are counted exactly once", () => {
    const base = certifyDoorToDoor({ stops: ARRABIDA_DAY, pickupCoord: LISBON });
    const withAddOn = certifyDoorToDoor({
      stops: ARRABIDA_DAY,
      pickupCoord: LISBON,
      addOnsMinutes: 45,
    });
    expect(withAddOn.doorToDoorMinutes - base.doorToDoorMinutes).toBe(45);
  });
});

describe("door-to-door authority — edits recompute", () => {
  it("admission is judged against the same door-to-door clock", () => {
    const input = { stops: ARRABIDA_DAY, pickupCoord: LISBON } as const;
    const admitted = certifyDoorToDoorAdmission(input, stop("extra-table", 75, SETUBAL));
    const base = certifyDoorToDoor(input);
    expect(admitted.doorToDoorMinutes).toBeGreaterThan(base.doorToDoorMinutes);
    expect(admitted.evaluable).toBe(true);
  });

  it("a swap does not grow the moment count", () => {
    const input = { stops: ARRABIDA_DAY, pickupCoord: LISBON } as const;
    const swapped = certifyDoorToDoorAdmission(input, stop("swapped", 45, SETUBAL), {
      replaceAt: 1,
    });
    expect(swapped.evaluable).toBe(true);
  });
});

describe("Studio time budget no longer inherits legacy 570/600 durations", () => {
  it("clamps a legacy extended Signature duration to the 9h ceiling", () => {
    const budget = resolveTimeBudget({ skeletonDurationMinutes: 600 });
    expect(budget.availableExperienceMinutes).toBe(540);
    expect(budget.notes).toMatch(/clamped/);
  });

  it("keeps catalogue reads verbatim behind the explicit escape hatch", () => {
    const budget = resolveTimeBudget({
      skeletonDurationMinutes: 600,
      allowLegacyExtendedDuration: true,
    });
    expect(budget.availableExperienceMinutes).toBe(600);
  });

  it("leaves already-compliant durations untouched", () => {
    expect(resolveTimeBudget({ skeletonDurationMinutes: 510 }).availableExperienceMinutes).toBe(510);
  });
});
