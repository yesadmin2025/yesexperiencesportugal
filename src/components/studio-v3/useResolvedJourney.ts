/**
 * useResolvedJourney — single source of truth for the composed journey.
 *
 * Every surface that displays journey facts (SignaturePriceCard, reveal,
 * checkout summary) reads from this hook. No component recomputes stops
 * or totals independently — divergences (reveal €X vs checkout €Y) can't
 * happen because they share one output.
 *
 * Pure, memoized, no side effects except a dev-only console.warn when the
 * caller's state carries mutually inconsistent pricing inputs.
 */

import { useMemo } from "react";
import { findTour } from "@/data/signatureTours";
import {
  resolveJourneyPricing,
  resolvePerPaxEur,
  type JourneyPriceLine,
} from "@/data/signatureTourPricing";
import type { TourPriceTiersMap } from "@/hooks/use-tour-price-tiers";
import { resolveStudioV3Route } from "./curation";
import {
  resolveAuthoritativeRouteStops,
  studioRouteShapingInput,
} from "./studioRouteAuthority";

import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";

export interface ResolvedJourneyStop {
  readonly label: string;
  readonly story: string;
}

export interface ResolvedJourney {
  readonly adults: number | null;
  readonly minorAges: readonly number[];
  /** Effective party size used for pricing display. Never null. */
  readonly guests: number;
  readonly stops: ReadonlyArray<ResolvedJourneyStop>;
  readonly addOns: SelectedAddOnSummary["items"];
  /**
   * Real adult unit price (never a blended average across adults + minors).
   * Callers that need to render minor bands should read `journeyLines` and
   * derive per-band units via `bandRowsFromJourney`.
   */
  readonly adultUnitEur: number | null;
  /**
   * @deprecated Legacy alias — equals `adultUnitEur`. New surfaces should
   * read `adultUnitEur` directly and render minor bands from `journeyLines`.
   */
  readonly perPaxEur: number | null;
  /**
   * Base journey total for the party BEFORE additions — the exact value
   * already computed inside this hook. Exposed for presentation only
   * (the P3B investment ledger). No new calculation.
   */
  readonly baseTotalEur: number | null;
  /** Unit-aware party total of the selected additions (sum of `amount`). */
  readonly addOnsPartyTotalEur: number;
  readonly totalEur: number | null;

  /**
   * Canonical age-banded per-traveller lines. Populated only when
   * composition (adults + minor ages) is complete. `null` for legacy
   * adults-only bookings — callers should show the flat per-pax total.
   */
  readonly journeyLines: readonly JourneyPriceLine[] | null;
  /** Sum of `journeyLines[].unitEur`. `null` when journeyLines is null. */
  readonly journeyTotalEur: number | null;
}

export function useResolvedJourney(
  state: StudioV3State,
  selectedAddOns: SelectedAddOnSummary["items"],
  tourPriceTiers?: TourPriceTiersMap | null,
): ResolvedJourney {
  return useMemo(() => {
    const tour = state.tourId ? findTour(state.tourId) : null;
    const adults = state.adults ?? null;
    const minorAges = state.minorAges ?? [];

    // Guests priority: explicit state.guests → adults + minors → 2.
    const fromComposition =
      typeof adults === "number" && adults >= 1 ? adults + minorAges.length : null;
    const guests =
      typeof state.guests === "number" && state.guests > 0 ? state.guests : (fromComposition ?? 2);

    // Stops priority chain — the single authority shared with the reveal,
    // the story snapshot and checkout. `tourId` anchors pricing only; it can
    // never overwrite an edited or composed route.
    const stops: ResolvedJourneyStop[] = resolveAuthoritativeRouteStops({
      editedRoutePoints: state.editedRoutePoints,
      resolved: resolveStudioV3Route(studioRouteShapingInput(state)),
      catalogStops: tour?.stops ?? null,
    });


    const tiers = tourPriceTiers ?? null;
    const basePerPaxEur = tour
      ? (resolvePerPaxEur(tour, guests, tiers)?.eurPerPax ?? tour.priceFrom ?? null)
      : null;

    // Age-band branch — full itemised lines when composition is complete.
    let journey: ReturnType<typeof resolveJourneyPricing> | null = null;
    if (tour && typeof adults === "number" && adults >= 1) {
      journey = resolveJourneyPricing(tour, adults, minorAges, tiers);
    }

    // Base total — prefer age-band, fall back to flat.
    let baseTotalEur: number | null = null;
    if (journey) {
      baseTotalEur = Math.round(journey.totalEur);
    } else if (basePerPaxEur != null) {
      baseTotalEur = Math.round(basePerPaxEur * guests);
    }

    // Add-on items already carry their unit-aware party amount. Summing those
    // values keeps per-person, per-group, per-vehicle and fixed additions
    // identical on refine, final reveal and checkout.
    const addOnsPartyTotalEur = selectedAddOns.reduce(
      (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
      0,
    );
    const totalEur = baseTotalEur != null ? Math.round(baseTotalEur + addOnsPartyTotalEur) : null;
    // Real adult unit price. Never a total/guests blend — averaging adults
    // with discounted minors produces a per-person number that matches
    // nothing the traveller actually pays.
    const adultUnitEur = (() => {
      if (journey) {
        const adultLine = journey.lines.find((l) => l.band === "adult");
        if (adultLine) return Math.round(adultLine.unitEur);
      }
      return basePerPaxEur != null ? Math.round(basePerPaxEur) : null;
    })();
    const perPaxEur = adultUnitEur;

    // Dev-only guardrails.
    if (import.meta.env.DEV) {
      if (
        typeof state.guests === "number" &&
        fromComposition != null &&
        state.guests !== fromComposition
      ) {
        console.warn("[resolvedJourney] guest source mismatch", {
          "state.guests": state.guests,
          "adults+minors": fromComposition,
        });
      }
    }

    return {
      adults,
      minorAges,
      guests,
      stops,
      addOns: selectedAddOns,
      adultUnitEur,
      perPaxEur,
      baseTotalEur,
      addOnsPartyTotalEur: Math.round(addOnsPartyTotalEur),
      totalEur,

      journeyLines: journey ? journey.lines : null,
      journeyTotalEur: journey ? Math.round(journey.totalEur) : null,
    };
  }, [state, selectedAddOns, tourPriceTiers]);
}
