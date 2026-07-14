// checkoutEligibility — single pure helper shared by browser code so the
// enum mapping between pricing source and instant-vs-enquiry can never
// silently diverge from the server contract in supabase/functions/_shared.
//
// Server truth:
//   source === "bokun-live"           → live commercial pricing came from
//                                        Bókun and a provisional reservation
//                                        can be created; instant checkout OK.
//   source === "manual-viator-tiers"  → derived from Viator per-pax tiers
//                                        without a live Bókun path; NO real
//                                        reservation is possible; enquiry only.

import type { QuoteSource, CheckoutEligibility } from "@/lib/pricing/bookingQuote";

export function deriveCheckoutEligibility(source: QuoteSource): CheckoutEligibility {
  return source === "bokun-live" ? "instant" : "enquiry_only";
}

/**
 * `true` when the quote can safely open Stripe checkout. Prefer the
 * server-provided `quote.checkoutEligibility` field when present; fall
 * back to source-derivation when older payloads reach the browser during
 * a rolling deploy.
 */
export function isInstantEligible(quote: {
  source?: QuoteSource;
  checkoutEligibility?: CheckoutEligibility;
} | null | undefined): boolean {
  if (!quote) return false;
  if (quote.checkoutEligibility) return quote.checkoutEligibility === "instant";
  if (quote.source) return deriveCheckoutEligibility(quote.source) === "instant";
  return false;
}
