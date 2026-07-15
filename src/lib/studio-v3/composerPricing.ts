/**
 * composerPricing — Phase D (adapter + tests only, no UI wiring).
 *
 * Bridges a composer input (region + budget tier + party) to a price using
 * the existing Signature tier + age-band engine. This module is pure and
 * intentionally isolated from any surface — no reveal card, no checkout,
 * no useResolvedJourney reads from it yet. Phase E is the wiring turn.
 *
 * Design constraint: we do NOT invent a new pricing model. Composer prices
 * anchor to the tier data already approved for real Signature tours
 * (`signatureTours[id].priceFrom` + `VIATOR_META[id].priceTiersEUR`, with
 * optional runtime overrides from `tour_price_tiers`). This preserves the
 * "no invented prices" guarantee.
 *
 * Anchor selection: each (region × budget tier) maps to the Signature tour
 * whose real Viator pricing best represents that experience level in that
 * region. When a mapping is missing we return null and the caller MUST fall
 * back to the current Signature-based pricing path — never fabricate.
 */

import { findTour, type SignatureTour } from "@/data/signatureTours";
import {
  resolveJourneyPricing,
  resolvePerPaxEur,
  type JourneyPricing,
  type PerPaxResolution,
} from "@/data/signatureTourPricing";
import type { PriceTiersEUR } from "@/data/signatureToursViator";
import type { RegionKey } from "@/data/regionStops";
import type { StudioBudgetTier } from "./composeStudioJourney";

/**
 * Anchor table: (region, tier) → Signature tour id used as the price anchor.
 * These are the real tours whose Viator tier data we borrow for composer
 * journeys of that region + budget shape. Chosen because their per-pax
 * curves match the intended composer experience level.
 *
 * Missing cells intentionally return null (caller falls back). We do not
 * back-fill with a "close enough" tour — silence beats a wrong anchor.
 */
const ANCHOR_TOUR_BY_REGION_TIER: Readonly<
  Record<RegionKey, Partial<Record<StudioBudgetTier, string>>>
> = {
  "lisbon-coast": {
    essential: "tiles-workshop",
    signature: "sintra-cascais",
    rare: "arrabida-wine-allinclusive",
  },
  arrabida: {
    essential: "azeitao-cheese",
    signature: "arrabida-boat",
    rare: "arrabida-wine-allinclusive",
  },
  alentejo: {
    essential: "evora-alentejo",
    signature: "troia-comporta",
    rare: "roman-heritage-alentejo",
  },
  centro: {
    essential: "fatima-nazare-obidos",
    signature: "tomar-coimbra",
  },
} as const;

export interface ComposerPricingInput {
  region: RegionKey;
  budgetTier: StudioBudgetTier;
  /** Adult count (18+). Must be ≥ 1. */
  adults: number;
  /** Integer ages of every non-adult (0..17). Empty = adults-only. */
  minorAges: readonly number[];
  /** Optional runtime tier overrides keyed by tour id. */
  overrides?: Record<string, PriceTiersEUR | undefined> | null;
}

export interface ComposerPricing {
  /** Anchor Signature tour whose tier data was used. Never invented. */
  readonly anchorTourId: string;
  /** Resolution for a party-size lookup (no age bands). */
  readonly perPax: PerPaxResolution;
  /** Full itemised age-banded pricing. */
  readonly journey: JourneyPricing;
  /** Headcount = adults + minors. */
  readonly headcount: number;
}

/**
 * Resolve the anchor Signature tour for a composer input.
 * Returns null when no mapping exists for that (region, tier) cell.
 */
export function resolveComposerAnchorTour(
  region: RegionKey,
  budgetTier: StudioBudgetTier,
): SignatureTour | null {
  const id = ANCHOR_TOUR_BY_REGION_TIER[region]?.[budgetTier];
  if (!id) return null;
  return findTour(id) ?? null;
}

/**
 * Price a composed journey. Returns null when:
 *   - no anchor tour exists for (region, tier),
 *   - adults < 1,
 *   - any minor age is out of a valid band (caller MUST reject checkout).
 *
 * Never throws, never invents. All numeric output derives from real Viator
 * tier data (or the anchor's `priceFrom` when tier data is absent for the
 * resolved party size).
 */
export function priceComposedJourney(
  input: ComposerPricingInput,
): ComposerPricing | null {
  if (!Number.isInteger(input.adults) || input.adults < 1) return null;
  const anchor = resolveComposerAnchorTour(input.region, input.budgetTier);
  if (!anchor) return null;

  const headcount = input.adults + input.minorAges.length;
  const perPax = resolvePerPaxEur(anchor, headcount, input.overrides ?? null);
  if (!perPax) return null;

  const journey = resolveJourneyPricing(
    anchor,
    input.adults,
    input.minorAges,
    input.overrides ?? null,
  );
  if (!journey) return null;

  return {
    anchorTourId: anchor.id,
    perPax,
    journey,
    headcount,
  };
}
