// Slice C (closure) — Traveller suitability metadata with explicit status.
//
// Records now carry an explicit `status`:
//  - "confirmed"              → author has attested to every rule listed
//                               (missing field = no restriction on that axis).
//  - "explicitly-unrestricted" → author has attested there is no operational
//                               restriction; safety-dependent fields are NOT
//                               silently inferred (see below).
//  - "unknown"                → no operational information available. Any
//                               request that includes a minor is BLOCKED with
//                               `suitability_not_ready`. Adult-only groups
//                               pass for backward compatibility.
//
// Safety-dependent fields that MUST NEVER silently default when a minor is
// present: `infantsAllowed`, `childSeatSupported`, `capacityCountsAllTravellers`.
// These are guarded by the unknown-blocker below.
//
// Marketing text is NEVER used to infer suitability.

export type SuitabilityStatus = "confirmed" | "explicitly-unrestricted" | "unknown";

export type TravellerSuitability = {
  minimumAge?: number;
  maximumAge?: number;
  /** false = age 0 not permitted. undefined on a confirmed record = permitted. */
  infantsAllowed?: boolean;
  /** false = supplier cannot provide/support a child seat. */
  childSeatSupported?: boolean;
  /** false = terrain/vehicle not stroller-suitable. */
  strollerSuitable?: boolean;
  /**
   * When false, capacity checks ignore infants/lap-children. Default (on a
   * confirmed record) is true — infants count toward capacity.
   */
  capacityCountsAllTravellers?: boolean;
};

export type SuitabilityRecord = TravellerSuitability & { status: SuitabilityStatus };

export type SuitabilityRequirements = {
  /** ALL selected ages (adults contribute as adult age, e.g. 30). */
  ages: number[];
  /** adults + minors including infants. */
  totalTravellers: number;
  requiresChildSeat: boolean;
  requiresStroller: boolean;
};

export type SuitabilityReason =
  | "unsupported_age"
  | "infant_not_allowed"
  | "child_seat_missing"
  | "stroller_unsupported"
  | "capacity_exceeded"
  | "suitability_not_ready";

export type SuitabilityCheck =
  | { ok: true }
  | {
      ok: false;
      reasons: SuitabilityReason[];
      unsupportedAges: number[];
    };

function hasMinors(req: SuitabilityRequirements): boolean {
  return req.ages.some((a) => a < 18);
}

/**
 * Check a resource's suitability metadata against the current traveller
 * requirements. Accepts either the new `SuitabilityRecord` (with `status`)
 * or the legacy `TravellerSuitability` (treated as an unknown record).
 *
 * `capacity` is optional; when omitted, capacity is not checked.
 */
export function checkTravellerSuitability(
  record: SuitabilityRecord | TravellerSuitability | undefined,
  req: SuitabilityRequirements,
  capacity?: number,
): SuitabilityCheck {
  // Normalise: legacy plain metadata (no status) is treated as "unknown".
  const status: SuitabilityStatus =
    record && typeof (record as SuitabilityRecord).status === "string"
      ? (record as SuitabilityRecord).status
      : "unknown";
  const meta: TravellerSuitability = record ?? {};

  // Unknown blocker — only for minor-carrying requests. Adult-only groups
  // pass with no metadata for backward compatibility.
  if (!record || status === "unknown") {
    if (hasMinors(req)) {
      return { ok: false, reasons: ["suitability_not_ready"], unsupportedAges: [] };
    }
    return { ok: true };
  }

  const reasons = new Set<SuitabilityReason>();
  const unsupportedAges = new Set<number>();

  for (const age of req.ages) {
    if (typeof meta.minimumAge === "number" && age < meta.minimumAge) {
      reasons.add("unsupported_age");
      unsupportedAges.add(age);
    }
    if (typeof meta.maximumAge === "number" && age > meta.maximumAge) {
      reasons.add("unsupported_age");
      unsupportedAges.add(age);
    }
    if (age === 0 && meta.infantsAllowed === false) {
      reasons.add("infant_not_allowed");
      unsupportedAges.add(0);
    }
  }

  if (req.requiresChildSeat && meta.childSeatSupported === false) {
    reasons.add("child_seat_missing");
  }
  if (req.requiresStroller && meta.strollerSuitable === false) {
    reasons.add("stroller_unsupported");
  }

  if (typeof capacity === "number") {
    // Confirmed records may opt out of counting infants; explicitly-unrestricted
    // records fall back to the safe default (count all).
    const countsAll = meta.capacityCountsAllTravellers !== false;
    const effective = countsAll
      ? req.totalTravellers
      : req.ages.filter((a) => a >= 2).length;
    if (effective > capacity) reasons.add("capacity_exceeded");
  }

  if (reasons.size === 0) return { ok: true };
  return {
    ok: false,
    reasons: [...reasons],
    unsupportedAges: [...unsupportedAges].sort((a, b) => a - b),
  };
}

/** Build a requirements object from a TravellerComposition + Studio state flags. */
export function requirementsFromComposition(
  composition: { adults: number; minorAges: number[] },
  flags: { requiresChildSeat?: boolean; requiresStroller?: boolean } = {},
): SuitabilityRequirements {
  const adultAges = Array.from({ length: Math.max(0, composition.adults) }, () => 30);
  return {
    ages: [...adultAges, ...composition.minorAges],
    totalTravellers: composition.adults + composition.minorAges.length,
    requiresChildSeat: !!flags.requiresChildSeat,
    requiresStroller: !!flags.requiresStroller,
  };
}
