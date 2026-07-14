// Single server-side resolver used by both `mode: "quote"` and
// `mode: "create-session"` on the create-signature-checkout edge function.
//
// Deterministic given the same normalised snapshot — used for signing AND
// for re-verification just before Stripe session creation.

import {
  resolveStudioCommercialPriceForComposition,
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

export type CheckoutEligibility = "instant" | "enquiry_only";

export interface ResolvedQuote {
  pricing: {
    status: QuoteStatus;
    commercialProductKey: string;
    guests: number;
    unitEur: number;
    baseSubtotalEur: number;
    baseLines: Array<{ label: string; quantity: number; unitEur: number; subtotalEur: number }>;
    addOnsSubtotalEur: number;
    totalEur: number;
    currency: "EUR";
  };
  addOns: AddOnLineItem[];
  inclusions: ResolvedInclusion[];
  routeStatus: RouteStatus;
  availabilityStatus: AvailabilityStatus;
  /** Server-owned. `instant` only when pricing is quoted AND route +
   *  availability are both validated by a real live-Bókun path. Anything
   *  short of that (studio commercial mapping missing, availability still
   *  pending-review, route pending-review) resolves to `enquiry_only` and
   *  the checkout endpoint fails closed. */
  checkoutEligibility: CheckoutEligibility;
}

/**
 * Pass 1 Bókun policy: NO dedicated Studio Bókun activity is mapped, so
 * availability + route always start at pending-review. Route may narrow to
 * validated only when every selected add-on is validated too (none are today).
 */
export function resolveQuote(snapshot: NormalisedSnapshot): ResolvedQuote {
  const commercial = resolveStudioCommercialPriceForComposition(
    snapshot.commercialProductKey,
    snapshot.travellerComposition,
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
        baseLines: [],
        addOnsSubtotalEur,
        totalEur: 0,
        currency: "EUR",
      },
      addOns: addOnLines,
      inclusions,
      routeStatus,
      availabilityStatus,
      checkoutEligibility: "enquiry_only",
    };
  }

  const c = commercial as Extract<CommercialPricingResult, { status: "quoted" }>;
  // Cast through the wider union — the Pass-1 policy above pins both values
  // to "pending-review", so TS narrows them to literals and would refuse the
  // comparison. The rule stays future-proof: as soon as a real live-Bókun
  // path can produce "validated" for both, eligibility flips to instant.
  type ConvergenceUnion = "validated" | "pending-review" | "unavailable";
  const _rs = routeStatus as ConvergenceUnion;
  const _as = availabilityStatus as ConvergenceUnion;
  const checkoutEligibility: CheckoutEligibility =
    _rs === "validated" && _as === "validated" ? "instant" : "enquiry_only";
  return {
    pricing: {
      status: "quoted",
      commercialProductKey: c.commercialProductKey,
      guests: c.guests,
      unitEur: c.unitEur,
      baseSubtotalEur: c.baseSubtotalEur,
      baseLines: c.baseLines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitEur: line.unitEur,
        subtotalEur: line.subtotalEur,
      })),
      addOnsSubtotalEur,
      totalEur: c.baseSubtotalEur + addOnsSubtotalEur,
      currency: "EUR",
    },
    addOns: addOnLines,
    inclusions,
    routeStatus,
    availabilityStatus,
    checkoutEligibility,
  };
}
