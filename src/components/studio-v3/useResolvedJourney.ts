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
import { type JourneyPriceLine } from "@/data/signatureTourPricing";
import {
  resolveConfirmedStudioParty,
  resolveStudioStrictJourneyPricing,
} from "@/lib/studio-v3/studioStrictTier";

import type { TourPriceTiersMap } from "@/hooks/use-tour-price-tiers";
import { resolveStudioV3Route } from "./curation";
import { studioComposedSupplementFromMoments } from "./studioWineryPresentation";
import {
  isProvablyUntouchedCanonicalAnchor,
  resolveAuthoritativeRouteStops,
  studioRouteShapingInput,
} from "./studioRouteAuthority";
import { rebuildLiveCommercialAuthority } from "@/lib/studio-v3/liveCommercialAuthority";
import {
  composableStopLineFromRows,
  type ComposableStopLine,
  type ComposableStopRow,
} from "@/lib/studio-v3/composableStopAuthority";

import type { StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";

export interface ResolvedJourneyStop {
  readonly label: string;
  readonly story: string;
  /** Structural identity when the source knew it. Commercial count authority. */
  readonly inventoryStopId?: string | null;
  readonly blueprintStopId?: string | null;
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
  readonly composableLines: readonly ComposableStopLine[];
  readonly composablePartyTotalEur: number;
  readonly totalEur: number | null;
  /**
   * THE single composed-day per-pax supplement (extra wineries beyond the
   * Signature entitlement). Every price surface — Your Day, Guest Details
   * quote, local Checkout Summary and the Stripe payload count — must read
   * this one value instead of recomputing from customer-facing labels.
   */
  readonly composedSupplementPerPaxEur: number;

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
  composableRows: readonly ComposableStopRow[] = [],
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
    const resolvedRoute = resolveStudioV3Route(studioRouteShapingInput(state));
    const stops: ResolvedJourneyStop[] = resolveAuthoritativeRouteStops({
      editedRoutePoints: state.editedRoutePoints,
      // PASS 4 — the frozen day shown in Your Day outranks any fresh
      // resolution triggered by logistics facts.
      committedRoutePoints: state.committedRoutePoints,
      resolved: resolvedRoute,
      catalogStops: tour?.stops ?? null,
      anchorTourId: tour?.id ?? null,
    });



    const tiers = tourPriceTiers ?? null;

    // PASS 5 — commercial confirmation gate. Exact Studio pricing exists only
    // after the traveller confirms an explicit, coherent party. The `2`
    // fallback above stays a display/operational value; it never prices.
    const confirmedParty = resolveConfirmedStudioParty({
      adults,
      minorAges,
      guests: state.guests ?? null,
      guestsInferred: state.guestsInferred,
    });

    // PASS 5 — strict runtime tier authority (same rows the server charges
    // from). No VIATOR_META tiers, no `priceFrom` anchor.
    // Composed-day commercial truth: the bespoke day may hold more wineries
    // than the Signature skeleton includes. The supplement comes from the one
    // approved authority (`tailorRules(...).wineries`) that the server mirrors,
    // so Your Day, the Guest Details quote, the Checkout Summary and Stripe all
    // show the same total.
    // P0-2 — counted from STRUCTURAL identity, never from the generic public
    // labels ("A second local winery"), which can collapse two distinct
    // suppliers into one key and silently under-charge the day.
    const composedSupplementPerPax = studioComposedSupplementFromMoments(
      state.tourId ?? null,
      stops,
    );

    const strictJourney = resolveStudioStrictJourneyPricing(
      state.tourId ?? null,
      confirmedParty,
      tiers,
      composedSupplementPerPax,
    );
    const journey = strictJourney;
    const basePerPaxEur = strictJourney ? strictJourney.perPaxAdultEur : null;

    const baseTotalEur = strictJourney ? Math.round(strictJourney.totalEur) : null;

    // Add-on items already carry their unit-aware party amount. Summing those
    // values keeps per-person, per-group, per-vehicle and fixed additions
    // identical on refine, final reveal and checkout.
    const addOnsPartyTotalEur = selectedAddOns.reduce(
      (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
      0,
    );
    const liveAuthority = rebuildLiveCommercialAuthority({
      anchorTourId: tour?.id ?? null,
      moments: stops,
      edited: !isProvablyUntouchedCanonicalAnchor({
        editedRoutePoints: state.editedRoutePoints ?? null,
        committedRoutePoints: state.committedRoutePoints ?? null,
        resolved: resolvedRoute,
        catalogStops: tour?.stops ?? null,
        anchorTourId: tour?.id ?? null,
      }),
    });
    const composableResolutionIds = (liveAuthority.ledger?.actions ?? [])
      .filter((action) => action.priceAction === "composable-stop")
      .map((action) => action.actionId.slice("composable:".length));
    const composableLines = composableResolutionIds
      .map((stopId) => composableStopLineFromRows(composableRows, stopId, guests))
      .filter((line): line is ComposableStopLine => line !== null);
    // A selected owner-priced activity may never disappear into a base-only
    // quote while its row is loading, missing, inactive, or below min guests.
    const composablePricingComplete = composableLines.length === composableResolutionIds.length;
    const composablePartyTotalEur = Math.round(
      composableLines.reduce((sum, line) => sum + line.totalEurCents, 0) / 100,
    );
    const totalEur =
      baseTotalEur != null && composablePricingComplete
        ? Math.round(baseTotalEur + addOnsPartyTotalEur + composablePartyTotalEur)
        : null;
    // Real adult unit price. Never a total/guests blend — averaging adults
    // with discounted minors produces a per-person number that matches
    // nothing the traveller actually pays.
    const adultUnitEur = basePerPaxEur != null ? Math.round(basePerPaxEur) : null;
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
      composableLines,
      composablePartyTotalEur,
      totalEur,
      composedSupplementPerPaxEur: composedSupplementPerPax,

      journeyLines: journey ? journey.lines : null,
      journeyTotalEur: journey ? Math.round(journey.totalEur) : null,
    };
  }, [state, selectedAddOns, tourPriceTiers, composableRows]);
}
