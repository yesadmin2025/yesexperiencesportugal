/**
 * Unified Pricing Module
 *
 * Single source of truth for ALL pricing calculations across:
 * - Product pages (SimpleBookingForm)
 * - Checkout pages (checkout.$token)
 * - Studio tailoring
 * - All experience types
 *
 * This ensures prices NEVER change between product page and checkout.
 */

import {
  resolveJourneyPricing,
  resolvePerPaxEur,
  type PerPaxResolution,
  type JourneyPricing,
} from "@/data/signatureTourPricing";
import type { SignatureTour } from "@/data/signatureTours";

export type PriceTiersEUR = Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>;

/**
 * Unified price resolution for ANY tour + composition
 *
 * ALWAYS use this function instead of calling resolveJourneyPricing directly.
 * This ensures consistent pricing across all surfaces.
 *
 * @param tour - Tour object with id and priceFrom
 * @param adults - Number of adult travelers
 * @param minorAges - Array of minor ages (0-17)
 * @param tierOverrides - Optional runtime price tier overrides from database
 * @returns Complete pricing object or null if invalid
 */
export function calculateUnifiedPrice(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  adults: number,
  minorAges: readonly number[] = [],
  tierOverrides?: Record<string, PriceTiersEUR | undefined> | null,
): JourneyPricing | null {
  if (!tour) return null;

  // Use the centralized pricing function
  const pricing = resolveJourneyPricing(tour, adults, minorAges, tierOverrides);

  return pricing;
}

/**
 * Get per-person price for display
 *
 * @param tour - Tour object
 * @param adults - Number of adults
 * @param minorAges - Array of minor ages
 * @param tierOverrides - Optional tier overrides
 * @returns Per-person EUR amount (or null if invalid)
 */
export function getPerPersonPrice(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  adults: number,
  minorAges: readonly number[] = [],
  tierOverrides?: Record<string, PriceTiersEUR | undefined> | null,
): number | null {
  const pricing = calculateUnifiedPrice(tour, adults, minorAges, tierOverrides);
  return pricing?.perPaxAdultEur ?? null;
}

/**
 * Get total party price
 *
 * @param tour - Tour object
 * @param adults - Number of adults
 * @param minorAges - Array of minor ages
 * @param tierOverrides - Optional tier overrides
 * @returns Total EUR for entire party (or null if invalid)
 */
export function getPartyTotalPrice(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  adults: number,
  minorAges: readonly number[] = [],
  tierOverrides?: Record<string, PriceTiersEUR | undefined> | null,
): number | null {
  const pricing = calculateUnifiedPrice(tour, adults, minorAges, tierOverrides);
  return pricing?.totalEur ?? null;
}

/**
 * Get per-pax resolution (with tier metadata)
 *
 * Used for display labels like "For 2 guests · per person"
 */
export function getPerPaxResolution(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  guests: number,
  tierOverrides?: Record<string, PriceTiersEUR | undefined> | null,
): PerPaxResolution | null {
  return resolvePerPaxEur(tour, guests, tierOverrides);
}

/**
 * Validate that pricing can be calculated
 *
 * @returns true if tour and composition are valid
 */
export function isPricingValid(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
  adults: number,
  minorAges: readonly number[] = [],
): boolean {
  if (!tour) return false;
  if (!Number.isInteger(adults) || adults < 1) return false;

  // All minor ages must be valid
  for (const age of minorAges) {
    if (!Number.isFinite(age) || age < 0 || age > 120) return false;
  }

  return true;
}
