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
} from "@/data/signatureTourPricing";
import type { TourPriceTiersMap } from "@/hooks/use-tour-price-tiers";
import { resolveStudioV3Route } from "./curation";
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
  readonly perPaxEur: number | null;
  readonly totalEur: number | null;
}

export function useResolvedJourney(
  state: StudioV3State,
  selectedAddOns: SelectedAddOnSummary["items"],
  /** Per-person normalized add-on total, already computed by SignaturePriceCard. */
  selectedAddOnsPerPaxEur: number,
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
      typeof state.guests === "number" && state.guests > 0
        ? state.guests
        : (fromComposition ?? 2);

    // Stops priority chain — same as reveal + checkout share.
    const stops: ResolvedJourneyStop[] = (() => {
      if (state.editedRoutePoints && state.editedRoutePoints.length > 0) {
        return state.editedRoutePoints.map((p) => ({
          label: p.label,
          story: p.story ?? "",
        }));
      }
      const resolved = resolveStudioV3Route({
        feeling: state.feeling,
        companions: state.companions,
        rhythm: state.rhythm,
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
        considerations: state.considerations,
        investment: state.investment,
        destinationIntent: state.destinationIntent,
      });
      if (resolved.routePoints.length > 0) {
        return resolved.routePoints.map((p) => ({
          label: p.label,
          story: p.story,
        }));
      }
      return (tour?.stops ?? []).map((s) => ({
        label: s.label,
        story: s.story ?? "",
      }));
    })();

    const tiers = tourPriceTiers ?? null;
    const perPaxEur = tour
      ? (resolvePerPaxEur(tour, guests, tiers)?.eurPerPax ?? tour.priceFrom ?? null)
      : null;

    // Total — age-band branch when composition is set, flat otherwise.
    let totalEur: number | null = null;
    if (tour) {
      const useAgeBand =
        typeof adults === "number" && adults >= 1 && minorAges.length > 0;
      if (useAgeBand) {
        const journey = resolveJourneyPricing(tour, adults!, minorAges, tiers);
        if (journey) {
          totalEur = Math.round(journey.totalEur + selectedAddOnsPerPaxEur * guests);
        }
      }
      if (totalEur == null && perPaxEur != null) {
        totalEur = Math.round(perPaxEur * guests + selectedAddOnsPerPaxEur * guests);
      }
    }

    // Dev-only guardrails.
    if (import.meta.env.DEV) {
      if (
        typeof state.guests === "number" &&
        fromComposition != null &&
        state.guests !== fromComposition
      ) {
        // eslint-disable-next-line no-console
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
      perPaxEur,
      totalEur,
    };
  }, [state, selectedAddOns, selectedAddOnsPerPaxEur, tourPriceTiers]);
}
