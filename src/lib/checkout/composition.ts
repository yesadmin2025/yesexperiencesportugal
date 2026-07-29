/**
 * Traveller composition — shared model used by every Signature booking
 * surface (SimpleBookingForm, tailor, Studio V3 GuestDetails, checkout
 * drawer, resume flow).
 *
 * A composition is the ONLY truthful headcount source. We never derive
 * pricing from a bare `guests: number` when minors are present, because
 * the server prices minors with owner-approved age bands (adult 18+ 100%
 * / youth 11–17 75% / child 3–10 50% / infant 0–2 free — see
 * `signatureTourPricing.ts`, decision 2026-07-14).
 */

export interface TravellerComposition {
  /** Adults 18+. Minimum 1. */
  readonly adults: number;
  /** Exact integer age (0..17) per minor. Empty means "adults only". */
  readonly minorAges: readonly number[];
}

export const MAX_ADULTS = 12;
export const MAX_MINORS = 11;
export const MAX_PARTY = 14;

/** Total headcount, including infants. */
export function totalGuests(c: TravellerComposition): number {
  return c.adults + c.minorAges.length;
}

/** True when every minor row has a real age (0..17) — server-ready. */
export function isCompositionComplete(c: TravellerComposition): boolean {
  if (!Number.isInteger(c.adults) || c.adults < 1) return false;
  for (const a of c.minorAges) {
    if (!Number.isInteger(a) || a < 0 || a > 17) return false;
  }
  return true;
}

/**
 * Human summary line used in the drawer, confirmation, story email.
 * Example: `4 guests · 2 adults · children aged 8 and 13`.
 */
export function formatCompositionSummary(c: TravellerComposition): string {
  const total = totalGuests(c);
  const parts = [
    `${total} guest${total === 1 ? "" : "s"}`,
    `${c.adults} adult${c.adults === 1 ? "" : "s"}`,
  ];
  if (c.minorAges.length > 0) {
    const ages = [...c.minorAges];
    let agesLabel: string;
    if (ages.length === 1) agesLabel = `aged ${ages[0]}`;
    else if (ages.length === 2) agesLabel = `aged ${ages[0]} and ${ages[1]}`;
    else agesLabel = `aged ${ages.slice(0, -1).join(", ")} and ${ages[ages.length - 1]}`;
    parts.push(`${ages.length === 1 ? "child" : "children"} ${agesLabel}`);
  }
  return parts.join(" · ");
}

/**
 * Legacy hydration — accepts a saved payload that may only carry
 * `{guests}` (pre-composition bookings/drafts) or the new
 * `{adults, minorAges}` shape. For legacy `{guests}` we materialise
 * `{adults: guests, minorAges: []}` for UI hydration ONLY.
 *
 * IMPORTANT: never use the hydrated value for a new quote without
 * re-confirming via the CompositionField — a legacy 3-guest party
 * could genuinely include children who deserve band pricing.
 */
export function hydrateLegacyComposition(
  saved: { adults?: unknown; minorAges?: unknown; guests?: unknown } | null | undefined,
): TravellerComposition {
  if (saved && typeof saved === "object") {
    const a = saved.adults;
    const m = saved.minorAges;
    if (
      typeof a === "number" &&
      Number.isInteger(a) &&
      a >= 1 &&
      Array.isArray(m) &&
      m.every((x) => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 17)
    ) {
      return { adults: a, minorAges: m as number[] };
    }
    const g = saved.guests;
    if (typeof g === "number" && Number.isInteger(g) && g >= 1) {
      return { adults: g, minorAges: [] };
    }
  }
  return { adults: 2, minorAges: [] };
}
