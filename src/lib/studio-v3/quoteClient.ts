// Client-side quote client for Studio V3.
//
// Wraps the create-signature-checkout edge function's `mode: "quote"` and
// `mode: "create-session"` calls. Never computes or displays a fallback
// authoritative total; the CTA stays disabled until the server responds.

import { supabase } from "@/integrations/supabase/client";
import type { TravellerComposition } from "@/lib/pricing/travellerComposition";

export type QuoteStatus = "quoted" | "unavailable" | "loading";
export type ConvergenceStatus = "validated" | "pending-review" | "unavailable";

export interface StudioQuoteSnapshot {
  commercialProductKey: "studio-v3-private-full-day";
  signatureId: string;
  title: string;
  destinationRegion: string;
  pickupCity: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  language: "en" | "pt" | "es" | "other";
  guests: number;
  travellerComposition: TravellerComposition;
  routeStops: Array<{ id: string; label: string }>;
  selectedAddOns: Array<{ id: string; quantity: number }>;
  routeStatus: ConvergenceStatus;
}

export interface StudioQuoteAddOnLine {
  id: string;
  label: string;
  priceUnit: "per_person" | "per_group" | "per_vehicle" | "fixed";
  unitEur: number;
  quantity: number;
  lineSubtotalEur: number;
  routeIntegration: ConvergenceStatus;
  inclusionIds: string[];
}

export type CheckoutEligibility = "instant" | "enquiry_only";

export interface StudioQuoteResponse {
  quoteToken: string;
  revision: string;
  snapshotHash: string;
  expiresAt: string;
  pricing: {
    status: QuoteStatus;
    commercialProductKey: string;
    guests: number;
    unitEur: number;
    baseSubtotalEur: number;
    baseLines: Array<{
      label: string;
      quantity: number;
      unitEur: number;
      subtotalEur: number;
    }>;
    addOnsSubtotalEur: number;
    totalEur: number;
    currency: "EUR";
  };
  addOns: StudioQuoteAddOnLine[];
  inclusions: Array<{ id: string; label: string }>;
  routeStatus: ConvergenceStatus;
  availabilityStatus: ConvergenceStatus;
  /** Server-owned. `instant` only when the resolved quote can back a real
   *  Bókun reservation. When `enquiry_only` the browser MUST NOT call
   *  create-session (the endpoint fails closed anyway). */
  checkoutEligibility: CheckoutEligibility;
  itinerary: {
    title: string;
    destinationRegion: string;
    pickupCity: string;
    date: string;
    startTime: string;
    language: string;
    guests: number;
    routeStops: Array<{ id: string; label: string }>;
  };
}

async function friendlyError(err: unknown): Promise<Error> {
  // Studio checkout surfaces `error.message` directly in the toast, so every
  // transport failure must arrive as guest-safe copy — never a raw
  // "Failed to fetch" or "Edge Function returned a non-2xx status code".
  const { parseCheckoutError } = await import("@/lib/checkout/checkoutError");
  const parsed = await parseCheckoutError(err);
  return new Error(parsed.userMessage);
}

export async function fetchStudioQuote(
  snapshot: StudioQuoteSnapshot,
): Promise<StudioQuoteResponse> {
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await supabase.functions.invoke("create-signature-checkout", {
      body: { mode: "quote", snapshot },
    }));
  } catch (thrown) {
    throw await friendlyError(thrown);
  }
  if (error) throw await friendlyError(error);
  return data as StudioQuoteResponse;
}

export interface CreateSessionInput {
  quoteToken: string;
  currentRevision: string;
  snapshot: StudioQuoteSnapshot;
  environment: "sandbox" | "live";
  returnUrl: string;
  cancelUrl?: string;
  uiMode?: "hosted" | "embedded";
  customerEmail?: string;
  guestDetails?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  url: string | null;
  clientSecret: string | null;
  sessionId: string;
  publishableKey: string;
  uiMode: "hosted" | "embedded";
  pricing: StudioQuoteResponse["pricing"];
  routeStatus: ConvergenceStatus;
  availabilityStatus: ConvergenceStatus;
  idempotencyKey: string;
}

export async function createStudioSession(input: CreateSessionInput): Promise<CreateSessionResponse> {
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await supabase.functions.invoke("create-signature-checkout", {
      body: { mode: "create-session", ...input },
    }));
  } catch (thrown) {
    throw await friendlyError(thrown);
  }
  if (error) throw await friendlyError(error);
  return data as CreateSessionResponse;
}
