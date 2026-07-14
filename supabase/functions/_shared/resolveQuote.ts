// Single server-side resolver used by both `mode: "quote"` and
// `mode: "create-session"` on the create-signature-checkout edge function.
//
// Deterministic given the same normalised snapshot — used for signing AND
// for re-verification just before Stripe session creation.

import {
  resolveStudioCommercialPrice,
  type CommercialPricingResult,
} from "./studioCommercialPricing.ts";
import {
  getServerAddOn,
  resolveAddOnLine,
  type AddOnLineItem,
} from "./signatureAddOnCatalogue.ts";
import type { NormalisedSnapshot } from "./quoteSnapshotSchema.ts";
import { resolveAuthoritativeInclusions, type ResolvedInclusion } from "./resolveInclusions.ts";

export type QuoteStatus = "quoted" | "unavailable" | "loading";
export type AvailabilityStatus = "validated" | "pending-review" | "unavailable";
export type RouteStatus = "validated" | "pending-review" | "unavailable";

export interface ResolvedQuote {
  pricing: {
    status: QuoteStatus;
    commercialProductKey: string;
    guests: number;
    unitEur: number;
    baseSubtotalEur: number;
    addOnsSubtotalEur: number;
    totalEur: number;
    currency: "EUR";
  };
  addOns: AddOnLineItem[];
  inclusions: ResolvedInclusion[];
  routeStatus: RouteStatus;
  availabilityStatus: AvailabilityStatus;
}

/**
 * Pass 1 Bókun policy: NO dedicated Studio Bókun activity is mapped, so
 * availability + route always start at pending-review. Route may narrow to
 * validated only when every selected add-on is validated too (none are today).
 */
export function resolveQuote(snapshot: NormalisedSnapshot): ResolvedQuote {
  const commercial = resolveStudioCommercialPrice(
    snapshot.commercialProductKey,
    snapshot.guests,
  );

  const addOnLines: AddOnLineItem[] = [];
  for (const req of snapshot.selectedAddOns) {
    const server = getServerAddOn(req.id);
    if (!server) continue;
    addOnLines.push(resolveAddOnLine(server, snapshot.guests, req.quantity));
  }
  const addOnsSubtotalEur = addOnLines.reduce((s, l) => s + l.lineSubtotalEur, 0);

  const inclusions = resolveAuthoritativeInclusions({
    bokunInclusions: null,
    productInclusions: null,
    addOnLines,
  });

  // Route status: worst-case across add-ons (pending-review wins over validated)
  const worstAddOn: RouteStatus = addOnLines.some((a) => a.routeIntegration === "unavailable")
    ? "unavailable"
    : addOnLines.some((a) => a.routeIntegration === "pending-review")
      ? "pending-review"
      : "validated";
  // Pass 1: no Studio Bókun mapping — always pending-review at minimum.
  const routeStatus: RouteStatus =
    worstAddOn === "unavailable" ? "unavailable" : "pending-review";
  const availabilityStatus: AvailabilityStatus = "pending-review";

  if (commercial.status === "unavailable") {
    return {
      pricing: {
        status: "unavailable",
        commercialProductKey: commercial.commercialProductKey,
        guests: commercial.guests,
        unitEur: 0,
        baseSubtotalEur: 0,
        addOnsSubtotalEur,
        totalEur: 0,
        currency: "EUR",
      },
      addOns: addOnLines,
      inclusions,
      routeStatus,
      availabilityStatus,
    };
  }

  const c = commercial as Extract<CommercialPricingResult, { status: "quoted" }>;
  return {
    pricing: {
      status: "quoted",
      commercialProductKey: c.commercialProductKey,
      guests: c.guests,
      unitEur: c.unitEur,
      baseSubtotalEur: c.baseSubtotalEur,
      addOnsSubtotalEur,
      totalEur: c.baseSubtotalEur + addOnsSubtotalEur,
      currency: "EUR",
    },
    addOns: addOnLines,
    inclusions,
    routeStatus,
    availabilityStatus,
  };
}
