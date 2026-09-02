/**
 * Age-band pricing — single server-side source of truth.
 *
 * Mirrors `AGE_BAND_PCT` / `ageBand()` in `src/data/signatureTourPricing.ts`.
 * Deno edge functions can't import from `src/`, so this file is the
 * canonical copy for every Supabase function that prices minors.
 * If you change these percentages, change the frontend copy in the
 * same commit.
 */

export type AgeBand = "adult" | "youth" | "child" | "infant";

export const AGE_BAND_PCT: Record<AgeBand, number> = {
  adult: 1.0,
  youth: 0.75,
  child: 0.5,
  infant: 0,
};

export function ageBand(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 0 || age > 17 || !Number.isInteger(age)) return null;
  if (age >= 11) return "youth";
  if (age >= 3) return "child";
  return "infant";
}

/* ---------------------------------------------------------------- *
 * Direct-booking discount + Tailor reduction policy (server copy). *
 * Mirrors `src/config/pricing.ts`. Edit both in the same commit.   *
 * ---------------------------------------------------------------- */

export const DIRECT_DISCOUNT_PCT = 0.15;
export const MIN_OPERATIONAL_PCT = 0.7;
export const TAILOR_PRINCIPAL_STEP_PCT = 0.05;
export const MAX_TAILOR_REDUCTION_PCT = 0.15;

export function directFromPlatform(platformEur: number): number {
  if (!Number.isFinite(platformEur) || platformEur <= 0) return 0;
  return Math.round(platformEur * (1 - DIRECT_DISCOUNT_PCT));
}

export function operationalFloor(directEur: number): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  return Math.round(directEur * MIN_OPERATIONAL_PCT);
}

export function tailorAdjustedPerPax(directEur: number, principalsRemoved: number): number {
  if (!Number.isFinite(directEur) || directEur <= 0) return 0;
  const raw = Math.max(0, principalsRemoved) * TAILOR_PRINCIPAL_STEP_PCT;
  const reductionPct = Math.min(raw, MAX_TAILOR_REDUCTION_PCT);
  const proposed = Math.round(directEur * (1 - reductionPct));
  return Math.max(proposed, operationalFloor(directEur));
}

/* ---------------------------------------------------------------- *
 * Authorized Tailor supplements (Canonical Signature Bible v1.1).  *
 * Mirrors `src/config/pricing.ts`. Edit both in the same commit.   *
 * Flat per-person amounts — never scaled by the % reduction.       *
 * ---------------------------------------------------------------- */

export const TAILOR_LUNCH_SUPPLEMENT_EUR = 35;
export const TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR = 20;

/**
 * "Remove the included lunch" — Setúbal & Arrábida Wine ONLY.
 * Fixed per-person credit. Not a negative supplement, not a stop removal:
 * excluded from the −15% cap, the % reduction and the 70% floor.
 */
export const TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR = 15;

export const TAILOR_LUNCH_REMOVAL_ELIGIBLE: ReadonlySet<string> = new Set([
  "arrabida-wine-allinclusive",
]);

/** Server-derived lunch-removal credit. Never trusts a client euro amount. */
export function serverLunchRemovalEur(tourId: string, lunchRemoved: boolean): number {
  return lunchRemoved === true && TAILOR_LUNCH_REMOVAL_ELIGIBLE.has(tourId)
    ? TAILOR_LUNCH_REMOVAL_DISCOUNT_EUR
    : 0;
}

export function tailorFinalPerPax(
  directEur: number,
  principalsRemoved: number,
  supplementsEur = 0,
  lunchRemovalEur = 0,
): number {
  const base = tailorAdjustedPerPax(directEur, principalsRemoved);
  const extra = Number.isFinite(supplementsEur) ? Math.max(0, Math.round(supplementsEur)) : 0;
  const credit = Number.isFinite(lunchRemovalEur) ? Math.max(0, Math.round(lunchRemovalEur)) : 0;
  return Math.max(0, base + extra - credit);
}

/**
 * Per-Signature Tailor entitlements — server mirror of `src/data/tailorRules.ts`.
 * The server never trusts a client-supplied euro amount: it re-derives the
 * supplement from booleans/counts using these tables.
 */
export const TAILOR_LUNCH_ELIGIBLE: ReadonlySet<string> = new Set([
  "troia-comporta",
  "southwest-vicentine-coast",
  "arrabida-boat",
  "sintra-cascais",
  "azeitao-cheese",
  "tomar-coimbra",
  "evora-alentejo",
  "fatima-nazare-obidos",
  "tiles-workshop",
]);

/** Extra wineries beyond the included baseline, per Signature. */
export const TAILOR_MAX_EXTRA_WINERIES: Record<string, number> = {
  "arrabida-wine-allinclusive": 2, // 2 included, up to 4
};

/**
 * Winery entitlement mirror — server copy of `tailorRules(...).wineries`.
 * `included` is the baseline the anchor price already covers, `max` the hard
 * ceiling, `requiresRemovalFrom` the winery count from which the guest must
 * TRADE AWAY another moment to make room. Parity with the client table is
 * enforced by a unit test.
 */
export const TAILOR_WINERY_ENTITLEMENT: Readonly<
  Record<string, { included: number; max: number; requiresRemovalFrom?: number }>
> = {
  "arrabida-wine-allinclusive": { included: 2, max: 4, requiresRemovalFrom: 4 },
};

/**
 * AUTHORITATIVE whitelist of blueprint core stop ids that may be TRADED AWAY
 * to make room for an extra winery, per Signature. Server mirror of the
 * non-winery `core` stops in `src/data/tailorBlueprints.ts`. This is NOT the
 * −5% principal ladder: a moment may legitimately be traded for time without
 * earning a price credit, so the two whitelists are deliberately distinct.
 */
export const TAILOR_TRADEABLE_STOP_IDS: Readonly<Record<string, readonly string[]>> = {
  "arrabida-wine-allinclusive": ["livramento", "arrabida-park", "azeitao-tiles", "lunch-azeitao"],
};

/**
 * Server-authoritative count of provably traded moments. Counts UNIQUE
 * whitelisted ids only — invented ids and duplicates earn nothing, so a
 * tampered payload can never manufacture the 4th-winery entitlement.
 */
export function serverWineryTradeOffCount(
  tourId: string,
  tradedStopIds: readonly string[] | undefined,
): number {
  if (!tradedStopIds || tradedStopIds.length === 0) return 0;
  const eligible = new Set(TAILOR_TRADEABLE_STOP_IDS[tourId] ?? []);
  const seen = new Set<string>();
  for (const id of tradedStopIds) {
    if (typeof id !== "string") continue;
    if (!eligible.has(id)) continue;
    seen.add(id);
  }
  return seen.size;
}

/**
 * FAIL-CLOSED entitlement gate for extra wineries.
 * Returns the number of extra wineries the server is willing to price, or
 * `null` when the composition claims a winery count that requires a trade-off
 * the payload cannot prove structurally.
 */
export function serverExtraWineriesAllowed(
  tourId: string,
  extraWineriesClaimed: number,
  tradedStopIds: readonly string[] | undefined,
): number | null {
  const maxExtra = TAILOR_MAX_EXTRA_WINERIES[tourId] ?? 0;
  const extra = Math.min(maxExtra, Math.max(0, Number(extraWineriesClaimed) | 0));
  if (extra === 0) return 0;
  const entitlement = TAILOR_WINERY_ENTITLEMENT[tourId];
  if (!entitlement) return extra;
  const threshold = entitlement.requiresRemovalFrom;
  if (threshold === undefined) return extra;
  const wineries = entitlement.included + extra;
  if (wineries < threshold) return extra;
  return serverWineryTradeOffCount(tourId, tradedStopIds) >= 1 ? extra : null;
}

export function serverTailorSupplementsEur(
  tourId: string,
  lunchAdded: boolean,
  extraWineries: number,
): number {
  const lunch = lunchAdded && TAILOR_LUNCH_ELIGIBLE.has(tourId) ? TAILOR_LUNCH_SUPPLEMENT_EUR : 0;
  const maxExtra = TAILOR_MAX_EXTRA_WINERIES[tourId] ?? 0;
  const extra = Math.min(maxExtra, Math.max(0, Number(extraWineries) | 0));
  return lunch + extra * TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR;
}

/* ---------------------------------------------------------------- *
 * Reveal add-ons — server mirror of `src/data/signatureAddOns.ts`. *
 * The server NEVER trusts a client-supplied add-on euro amount: it *
 * re-derives it from the catalog percentage and the tour's own     *
 * approved 8-pax anchor. Ids absent from this table are rejected.  *
 * Parity with the client catalog is enforced by a unit test.       *
 * ---------------------------------------------------------------- */

export type AddOnPricingUnit = "per_person" | "per_group" | "per_vehicle" | "fixed";

export const SIGNATURE_ADD_ON_CATALOG: Record<
  string,
  {
    pricePctOfBase: number;
    pricingUnit: AddOnPricingUnit;
    /** CANONICAL commercial label. A client-supplied label is never trusted. */
    label: string;
    /** CANONICAL duration promise, minutes. A client value is never trusted. */
    durationMinutes: number;
  }
> = {
  "hidden-cove-picnic": {
    pricePctOfBase: 0.18,
    pricingUnit: "per_person",
    label: "Hidden-cove beach picnic",
    durationMinutes: 90,
  },
  "coastal-boat-ride": {
    pricePctOfBase: 0.22,
    pricingUnit: "per_person",
    label: "Coastal boat ride from Sesimbra",
    durationMinutes: 75,
  },
  "azulejo-workshop": {
    pricePctOfBase: 0.16,
    pricingUnit: "per_person",
    label: "Hand-painted azulejo workshop",
    durationMinutes: 90,
  },
  "azeitao-cheese": {
    pricePctOfBase: 0.14,
    pricingUnit: "per_person",
    label: "Azeitão cheese-making session",
    durationMinutes: 60,
  },
  "sintra-detour": {
    pricePctOfBase: 0.2,
    pricingUnit: "per_person",
    label: "Sintra detour — Pena & Cabo da Roca",
    durationMinutes: 120,
  },
  "chapel-of-bones": {
    pricePctOfBase: 0.16,
    pricingUnit: "per_person",
    label: "Chapel of Bones, after the queue",
    durationMinutes: 60,
  },
  "talha-amphora": {
    pricePctOfBase: 0.18,
    pricingUnit: "per_person",
    label: "Talha amphora wine tasting",
    durationMinutes: 75,
  },
  "roman-ruins-trail": {
    pricePctOfBase: 0.12,
    pricingUnit: "per_person",
    label: "Roman heritage stop",
    durationMinutes: 45,
  },
  "roman-troia": {
    pricePctOfBase: 0.14,
    pricingUnit: "per_person",
    label: "Roman ruins of Tróia",
    durationMinutes: 60,
  },
  "herdade-tasting": {
    pricePctOfBase: 0.2,
    pricingUnit: "per_person",
    label: "Comporta winery tasting",
    durationMinutes: 75,
  },
  "templar-tomar": {
    pricePctOfBase: 0.18,
    pricingUnit: "per_person",
    label: "Templar Convent of Tomar",
    durationMinutes: 75,
  },
  "obidos-walls": {
    pricePctOfBase: 0.14,
    pricingUnit: "per_person",
    label: "Walled town of Óbidos",
    durationMinutes: 60,
  },
  "nazare-cliffs": {
    pricePctOfBase: 0.16,
    pricingUnit: "per_person",
    label: "Nazaré giant-wave cliffs",
    durationMinutes: 45,
  },
};

/* ------------------------------------------------------------------ *
 * STRUCTURAL ELIGIBILITY MIRROR                                      *
 *                                                                    *
 * The MAXIMUM set of base Signature tour ids each add-on may ever be *
 * attached to. Derived from the client's composition-independent     *
 * structural rules (`isAddOnStructurallyEligible`):                  *
 *   - same region bucket                                             *
 *   - same Lisbon sub-region (when both declare one)                 *
 *   - add-on's own `sourceTourId` is never its own base tour         *
 *   - `conflictsWith` must not intersect the tour's inclusion tags   *
 *                                                                    *
 * Deliberately NOT enforced here: minStops / minHours / remaining    *
 * minutes / capacity / time-of-day. Those depend on the composed     *
 * itinerary and stay stricter UI-side filters — client-supplied      *
 * route facts are never treated as server authority.                 *
 *                                                                    *
 * An empty array means the add-on is currently DORMANT: no live      *
 * Signature can carry it, and the server rejects it everywhere.      *
 * Parity with the client data is enforced by a unit test.            *
 * ------------------------------------------------------------------ */
export const SIGNATURE_ADD_ON_ALLOWED_TOURS: Record<string, readonly string[]> = {
  "hidden-cove-picnic": [],
  "coastal-boat-ride": [
    "arrabida-wine-allinclusive",
    "wild-beaches-picnic",
    "tiles-workshop",
    "azeitao-cheese",
  ],
  "azulejo-workshop": [
    "arrabida-wine-allinclusive",
    "wild-beaches-picnic",
    "arrabida-boat",
    "azeitao-cheese",
  ],
  "azeitao-cheese": ["arrabida-wine-allinclusive", "wild-beaches-picnic", "arrabida-boat"],
  "sintra-detour": [],
  "chapel-of-bones": ["roman-heritage-alentejo", "southwest-vicentine-coast"],
  "talha-amphora": ["southwest-vicentine-coast"],
  "roman-ruins-trail": ["evora-alentejo", "southwest-vicentine-coast"],
  "roman-troia": [],
  "herdade-tasting": [],
  "templar-tomar": ["fatima-nazare-obidos"],
  "obidos-walls": ["tomar-coimbra"],
  "nazare-cliffs": ["tomar-coimbra"],
};

/**
 * Server-authoritative MAXIMUM structural eligibility check. Returns true
 * only when the add-on id exists in the approved catalog AND the resolved
 * base Signature is on its structural whitelist.
 */
export function serverAddOnAllowedForTour(
  addOnId: string,
  tourId: string | null | undefined,
): boolean {
  if (!addOnId || !tourId) return false;
  if (!SIGNATURE_ADD_ON_CATALOG[addOnId]) return false;
  const allowed = SIGNATURE_ADD_ON_ALLOWED_TOURS[addOnId];
  if (!allowed) return false;
  return allowed.includes(tourId);
}

/** Round to nearest €5, floor €5 — mirrors `roundEur5` in the client catalog. */
export function serverRoundEur5(eur: number): number {
  return Math.max(5, Math.round(eur / 5) * 5);
}


/**
 * Server-authoritative add-on line. `baseEur` MUST be the tour's approved
 * 8-pax anchor from `tour_price_tiers` — never a client-supplied number.
 * Returns null when the add-on id is not in the approved catalog.
 */
export function serverAddOnLine(
  id: string,
  baseEur: number,
  guests: number,
  vehicleCapacity = 4,
): {
  perUnitEur: number;
  quantity: number;
  unit: AddOnPricingUnit;
  label: string;
  durationMinutes: number;
} | null {
  const entry = SIGNATURE_ADD_ON_CATALOG[id];
  if (!entry || !Number.isFinite(baseEur) || baseEur <= 0) return null;
  const perUnitEur = serverRoundEur5(baseEur * entry.pricePctOfBase);
  const guestsSafe = Math.max(1, Math.floor(guests));
  const cap = Math.max(1, Math.floor(vehicleCapacity));
  const quantity =
    entry.pricingUnit === "per_person"
      ? guestsSafe
      : entry.pricingUnit === "per_vehicle"
        ? Math.ceil(guestsSafe / cap)
        : 1;
  // Commercial identity (label + duration promise) is owned by the catalog.
  return {
    perUnitEur,
    quantity,
    unit: entry.pricingUnit,
    label: entry.label,
    durationMinutes: entry.durationMinutes,
  };
}

/**
 * THE add-on total, for every pricing unit. Exactly the canonical per-unit
 * price × the canonical quantity Stripe is charging — never guests × unit.
 * Checkout metadata and the booking snapshot both read this single helper,
 * so they cannot diverge from the charged Stripe lines.
 *
 * Pure. Adds no pricing rule of its own.
 */
export function serverAddOnsChargedTotalEur(
  lines: ReadonlyArray<{ perUnitEur: number; quantity: number }>,
): number {
  return lines.reduce((sum, line) => sum + line.perUnitEur * line.quantity, 0);
}

/**
 * Included-lunch stop governed by the dedicated −€15 pp removal credit.
 * Server mirror of `TAILOR_DEDICATED_LUNCH_STOP_ID` in
 * `src/data/tailorRules.ts`. Removing this stop is NOT a principal-stop
 * removal, so it can never also earn the −5% ladder reduction.
 */
export const TAILOR_DEDICATED_LUNCH_STOP_ID: Readonly<Record<string, string>> = {
  "arrabida-wine-allinclusive": "lunch-azeitao",
};

/**
 * AUTHORITATIVE whitelist of Tailor core stop ids that may earn the −5%
 * principal-removal reduction, per Signature. Server mirror of
 * `principalEligibleStopIds()` in `src/data/tailorRules.ts`, which is driven
 * by the explicit pricing classification in `src/data/tailorStopPricing.ts`.
 * ONLY stops explicitly classified `principal` appear here: locked anchors,
 * the dedicated included-lunch stop, descriptive/free stops (viewpoints,
 * drive-bys — removable for time, never for money) and `needs-owner-review`
 * stops are FAIL-CLOSED and earn nothing. Parity is enforced by a unit test.
 * A tour absent from this table earns no reduction.
 */
export const TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS: Readonly<Record<string, readonly string[]>> = {
  "arrabida-wine-allinclusive": ["livramento", "azeitao-tiles"],
  "wild-beaches-picnic": ["livramento"],
  "arrabida-boat": ["livramento"],
  "tiles-workshop": ["livramento", "lunch-azeitao"],
  "azeitao-cheese": ["livramento", "lunch-azeitao"],
  "sintra-cascais": ["lunch-azenhas"],
  "troia-comporta": ["troia-ruins", "herdade-comporta", "comporta-lunch"],
  "evora-alentejo": ["templo-romano", "chapel-of-bones", "evora-lunch"],
  "tomar-coimbra": ["convento-cristo", "tomar-lunch", "coimbra-uni", "biblioteca-joanina"],
  "fatima-nazare-obidos": ["fatima", "nazare-lunch"],
  "roman-heritage-alentejo": ["sao-cucufate", "vinho-talha", "mestre-daniel", "talha-lunch"],
};


/**
 * Server-authoritative principal-removal count from client-supplied ids.
 * Counts UNIQUE whitelisted ids only — invented ids, duplicated ids, locked
 * anchors and the dedicated included-lunch stop are all ignored, so a
 * tampered payload can never manufacture the −15% Tailor reduction.
 */
export function serverPrincipalRemovalCount(
  tourId: string,
  skippedStopIds: readonly string[],
): number {
  const eligible = new Set(TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS[tourId] ?? []);
  const lunchId = TAILOR_DEDICATED_LUNCH_STOP_ID[tourId] ?? null;
  const seen = new Set<string>();
  for (const id of skippedStopIds) {
    if (typeof id !== "string") continue;
    if (lunchId && id === lunchId) continue;
    if (!eligible.has(id)) continue;
    seen.add(id);
  }
  return seen.size;
}
