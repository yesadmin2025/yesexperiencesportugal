// Resolve the commercial Bókun mapping for a given flow + commercialProductKey.
//
// Signature/Tailored: reads `tour_bokun_option_mapping` (product+option+rate) and
// falls back to `tour_bokun_mapping` (product-only) for backwards compatibility.
// Studio: reads `studio_commercial_bokun_mapping` for the dedicated skeleton row.
// Studio MUST NEVER resolve to a Signature tour's mapping — enforced here.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { BookingFlow } from "./bookingQuote.ts";

export interface CommercialMapping {
  commercialMappingId: string;   // stable id used in stored quote + Stripe metadata
  bokunProductId: string;
  bokunOptionId: string | null;
  bokunRateId: string | null;
  pricingPartySizeRule: "billable_participants" | "all_participants";
  source: "signature-option" | "signature-legacy" | "studio";
}

export interface CommercialMappingError {
  reason: "no_commercial_mapping" | "studio_mapping_disabled" | "unknown";
  message: string;
}

export type CommercialMappingResult =
  | { ok: true; mapping: CommercialMapping }
  | { ok: false; error: CommercialMappingError };

export async function resolveCommercialMapping(
  admin: SupabaseClient,
  flow: BookingFlow,
  commercialProductKey: string,
): Promise<CommercialMappingResult> {
  if (flow === "studio") {
    const { data, error } = await admin
      .from("studio_commercial_bokun_mapping")
      .select("commercial_product_key, bokun_product_id, bokun_option_id, bokun_rate_id, pricing_party_size_rule, active")
      .eq("commercial_product_key", commercialProductKey)
      .maybeSingle();

    if (error) {
      return { ok: false, error: { reason: "unknown", message: `studio mapping fetch failed: ${error.message}` } };
    }
    if (!data) {
      return {
        ok: false,
        error: {
          reason: "no_commercial_mapping",
          message: `No Studio commercial mapping row for ${commercialProductKey}.`,
        },
      };
    }
    if (!data.active || !data.bokun_product_id) {
      return {
        ok: false,
        error: {
          reason: "studio_mapping_disabled",
          message:
            "Studio Bókun mapping is not active yet. Live availability + pricing require a configured Bókun product/option/rate for the Studio skeleton.",
        },
      };
    }
    return {
      ok: true,
      mapping: {
        commercialMappingId: `studio:${commercialProductKey}`,
        bokunProductId: String(data.bokun_product_id),
        bokunOptionId: data.bokun_option_id ? String(data.bokun_option_id) : null,
        bokunRateId: data.bokun_rate_id ? String(data.bokun_rate_id) : null,
        pricingPartySizeRule:
          (data.pricing_party_size_rule as CommercialMapping["pricingPartySizeRule"]) ??
          "billable_participants",
        source: "studio",
      },
    };
  }

  // Signature + Tailored share the same commercial mapping.
  const { data: opt } = await admin
    .from("tour_bokun_option_mapping")
    .select("bokun_product_id, bokun_option_id, bokun_rate_id, pricing_party_size_rule")
    .eq("tour_id", commercialProductKey)
    .maybeSingle();

  if (opt?.bokun_product_id) {
    return {
      ok: true,
      mapping: {
        commercialMappingId: `signature:${commercialProductKey}:opt`,
        bokunProductId: String(opt.bokun_product_id),
        bokunOptionId: opt.bokun_option_id ? String(opt.bokun_option_id) : null,
        bokunRateId: opt.bokun_rate_id ? String(opt.bokun_rate_id) : null,
        pricingPartySizeRule:
          (opt.pricing_party_size_rule as CommercialMapping["pricingPartySizeRule"]) ??
          "billable_participants",
        source: "signature-option",
      },
    };
  }

  const { data: legacy } = await admin
    .from("tour_bokun_mapping")
    .select("bokun_product_id")
    .eq("tour_id", commercialProductKey)
    .maybeSingle();

  if (legacy?.bokun_product_id) {
    return {
      ok: true,
      mapping: {
        commercialMappingId: `signature:${commercialProductKey}:legacy`,
        bokunProductId: String(legacy.bokun_product_id),
        bokunOptionId: null,
        bokunRateId: null,
        pricingPartySizeRule: "billable_participants",
        source: "signature-legacy",
      },
    };
  }

  return {
    ok: false,
    error: {
      reason: "no_commercial_mapping",
      message: `No Bókun mapping found for signature tour "${commercialProductKey}".`,
    },
  };
}
