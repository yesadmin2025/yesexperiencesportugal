// Client-side helpers for the launch-spec v3 checkout path.
//
// Two entry points:
//   • fetchBookingQuote() → one-shot invoke of the `booking-quote` edge
//     function; returns a signed BookingQuote (or unavailable reason).
//   • createBookingQuoteSession() → invokes `create-signature-checkout` in
//     `mode: "booking-quote-create-session"`, which verifies the signed
//     quoteToken, re-reads the persisted quote, revalidates the Bókun slot
//     and returns a Stripe session. All three surfaces (Signature,
//     Tailored, Studio V3) go through this single entry point.

import { supabase } from "@/integrations/supabase/client";
import type {
  BookingFlow,
  BookingQuoteResponse,
} from "@/lib/pricing/bookingQuote";
import type { TravellerComposition } from "@/lib/pricing/travellerComposition";


export type BookingQuoteCheckoutInput = {
  quoteToken: string;
  environment: "sandbox" | "live";
  returnUrl: string;
  cancelUrl?: string;
  uiMode?: "hosted" | "embedded";
  customerEmail?: string;
  tourTitle?: string;
  pickupLabel?: string;
  journeyTitle?: string;
};

export type BookingQuoteCheckoutResponse = {
  url: string | null;
  clientSecret: string | null;
  sessionId: string;
  publishableKey: string;
  flow: "signature" | "tailor" | "studio";
  productName: string;
  submitMessage: string;
  uiMode: "hosted" | "embedded";
  pricing: {
    baseLines: Array<{
      bokunCategoryId: string;
      label: string;
      quantity: number;
      unitEur: number;
      subtotalEur: number;
      isFree?: boolean;
    }>;
    baseSubtotalEur: number;
    addOnLines: Array<{
      id: string;
      label: string;
      pricingUnit: string;
      quantity: number;
      unitEur: number;
      subtotalEur: number;
    }>;
    addOnSubtotalEur: number;
    finalTotalEur: number;
  };
  idempotencyKey: string;
};

export async function createBookingQuoteSession(
  input: BookingQuoteCheckoutInput,
): Promise<BookingQuoteCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
    body: {
      mode: "booking-quote-create-session",
      ...input,
    },
  });
  if (error) throw error;
  const resp = data as BookingQuoteCheckoutResponse | { error?: string } | null;
  if (!resp || typeof resp !== "object" || !("sessionId" in resp)) {
    const msg =
      resp && typeof resp === "object" && "error" in resp && resp.error
        ? String(resp.error)
        : "Checkout session unavailable";
    throw new Error(msg);
  }
  return resp;
}

export type FetchBookingQuoteInput = {
  flow: BookingFlow;
  commercialProductKey: string;
  date: string;
  startTime?: string;
  availabilityId?: string;
  composition: TravellerComposition;
  selectedAddOns?: Array<{ id: string; quantity: number }>;
  pricingRevision: string;
  itineraryRevision?: string;
  itinerarySnapshot?: { title: string; routeStops: Array<{ id: string; label: string }> };
};

export async function fetchBookingQuote(
  input: FetchBookingQuoteInput,
): Promise<BookingQuoteResponse> {
  const { data, error } = await supabase.functions.invoke("booking-quote", {
    body: {
      flow: input.flow,
      commercialProductKey: input.commercialProductKey,
      date: input.date,
      startTime: input.startTime,
      availabilityId: input.availabilityId,
      travellerComposition: input.composition,
      selectedAddOns: (input.selectedAddOns ?? []).filter((a) => a.quantity > 0),
      pricingRevision: input.pricingRevision,
      itineraryRevision: input.itineraryRevision,
      itinerarySnapshot: input.itinerarySnapshot,
    },
  });
  if (error) throw error;
  return data as BookingQuoteResponse;
}

