// Provider-neutral BookingQuote contract — shared by client & edge.
// Exact shape from the launch spec §10. Do not add optional fields without
// updating: bokun-quote (write), create-signature-checkout (verify),
// stripe-webhook (consume), useBookingQuote (subscribe).

export type BookingFlow = "signature" | "tailor" | "studio";
export type QuoteSource = "bokun-live";
export type BookingAvailability = "available" | "unavailable";
export type BookingAddOnPricingUnit = "per_person" | "per_group" | "per_vehicle" | "fixed";

export interface BookingQuoteBaseLine {
  bokunCategoryId: string;
  label: string;
  minAge?: number;
  maxAge?: number;
  /** Ages contributing (empty for the adult line). */
  ages?: number[];
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  /** True when the category is priced at 0 (e.g. infant). Kept in stored quote + Stripe metadata. */
  isFree?: boolean;
}

export interface BookingQuoteAddOnLine {
  id: string;
  label: string;
  pricingUnit: BookingAddOnPricingUnit;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
}

export interface BookingQuote {
  quoteId: string;
  quoteToken: string;
  expiresAt: string;

  flow: BookingFlow;
  source: QuoteSource;

  commercialProductKey: string;
  commercialMappingId: string;

  productId: string;
  optionId: string;
  rateId?: string;
  availabilityId: string;

  date: string;
  startTime: string;

  pricingRevision: string;
  itineraryRevision?: string;

  travellerComposition: {
    adults: number;
    minorAges: number[];
  };

  resolvedGuestMix: {
    adults: number;
    youths: number;
    children: number;
    infants: number;
    totalParticipants: number;
  };

  basePricing: {
    lines: BookingQuoteBaseLine[];
    subtotalEur: number;
  };

  addOnPricing: {
    lines: BookingQuoteAddOnLine[];
    subtotalEur: number;
  };

  finalTotalEur: number;
  currency: "EUR";

  availabilityStatus: BookingAvailability;
}

/** Server-side unavailable response — no token, no persisted quote. */
export interface BookingQuoteUnavailable {
  availabilityStatus: "unavailable";
  flow: BookingFlow;
  commercialProductKey: string;
  reason:
    | "no_commercial_mapping"
    | "studio_mapping_disabled"
    | "bokun_unreachable"
    | "no_slots"
    | "slot_unavailable"
    | "slot_capacity_lost"
    | "no_adult_category"
    | "age_unsupported"
    | "add_on_invalid"
    | "price_missing"
    | "unknown";
  /** Ages the server could not resolve, if reason === "age_unsupported". */
  unresolvedAges?: number[];
  message: string;
  /** Optional diagnostics — surfaced for admin/debug flows, safe to expose. */
  diagnostics?: BookingQuoteDiagnostics;
}

export interface BookingQuoteDiagnostics {
  tourId: string;
  bokunProductId?: string;
  bokunOptionId?: string | null;
  bokunRateId?: string | null;
  mirrorHadCategories: boolean;
  autoSyncTriggered: boolean;
  autoSyncOk?: boolean;
  autoSyncReason?: string;
  autoSyncWarnings?: string[];
  categoryCountAfter?: number;
  suggestedCount?: number;
  unmappedCount?: number;
  confirmedCount?: number;
  durationMs?: number;
}

export type BookingQuoteResponse = BookingQuote | BookingQuoteUnavailable;

export function isQuoteAvailable(q: BookingQuoteResponse | null | undefined): q is BookingQuote {
  return !!q && q.availabilityStatus === "available";
}

/**
 * Compute a stable pricingRevision id from inputs that must invalidate
 * pricing. Any change here bumps the id and clients discard the old quote.
 */
export function computePricingRevision(input: {
  commercialProductKey: string;
  date: string;
  startTime?: string | null;
  availabilityId?: string | null;
  adults: number;
  minorAges: number[];
  addOns: Array<{ id: string; quantity: number }>;
  vehicleClass?: string | null;
  duration?: string | null;
  operatingZone?: string | null;
}): string {
  const norm = {
    p: input.commercialProductKey,
    d: input.date,
    t: input.startTime ?? "",
    a: input.availabilityId ?? "",
    ad: input.adults,
    m: [...input.minorAges].sort((a, b) => a - b),
    ao: [...input.addOns]
      .filter((x) => x.quantity > 0)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((x) => `${x.id}:${x.quantity}`),
    v: input.vehicleClass ?? "",
    du: input.duration ?? "",
    z: input.operatingZone ?? "",
  };
  return "pr_" + hashString(JSON.stringify(norm));
}

/** Non-crypto FNV-1a — stable, tiny, and identical on client and edge. */
function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
