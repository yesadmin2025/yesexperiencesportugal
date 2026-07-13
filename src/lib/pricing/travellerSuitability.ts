// Slice C — Traveller suitability metadata.
//
// Server-owned suitability facts for Studio candidates (tours) and itinerary
// components (stops). Safe defaults are UNRESTRICTED — missing fields never
// imply a restriction. Restrictions are only added when a real operational
// fact is known. Marketing text is NEVER used to infer suitability.

export type TravellerSuitability = {
  minimumAge?: number;
  maximumAge?: number;
  /** false = age 0 not permitted. undefined = permitted. */
  infantsAllowed?: boolean;
  /** false = supplier cannot provide/support a child seat. */
  childSeatSupported?: boolean;
  /** false = terrain/vehicle not stroller-suitable. */
  strollerSuitable?: boolean;
  /**
   * When false, capacity checks ignore infants/lap-children. Default: true
   * (infants count toward capacity, matching Bokun's default participant
   * counting).
   */
  capacityCountsAllTravellers?: boolean;
};

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
  | "capacity_exceeded";

export type SuitabilityCheck =
  | { ok: true }
  | {
      ok: false;
      reasons: SuitabilityReason[];
      unsupportedAges: number[];
    };

/**
 * Check a resource's suitability metadata against the current traveller
 * requirements. `capacity` is optional; when omitted, capacity is not checked.
 */
export function checkTravellerSuitability(
  s: TravellerSuitability | undefined,
  req: SuitabilityRequirements,
  capacity?: number,
): SuitabilityCheck {
  const reasons = new Set<SuitabilityReason>();
  const unsupportedAges = new Set<number>();

  const meta = s ?? {};

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
    const countsAll = meta.capacityCountsAllTravellers !== false;
    const effective = countsAll
      ? req.totalTravellers
      : req.ages.filter((a) => a >= 2).length; // infants (0-1) excluded when opted out
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
