// Purely client-side quote hook. No network calls.
// Reads code-defined tiers + optional DB overrides from useTourPriceTiers.

import { useMemo } from "react";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import {
  resolveInternalQuote,
  type AddOnInput,
  type InternalQuote,
} from "@/lib/pricing/resolveInternalQuote";
import type { SignatureTour } from "@/data/signatureTours";
import type { TravellerComposition } from "@/lib/pricing/travellerComposition";

export function useInternalQuote(args: {
  tour: Pick<SignatureTour, "id" | "priceFrom">;
  composition: TravellerComposition;
  addOns?: AddOnInput[];
  enabled?: boolean;
}): { quote: InternalQuote | null; loading: boolean } {
  const enabled = args.enabled !== false;
  const { data: overrides, isLoading } = useTourPriceTiers();

  const quote = useMemo<InternalQuote | null>(() => {
    if (!enabled) return null;
    return resolveInternalQuote({
      tour: args.tour,
      composition: args.composition,
      addOns: args.addOns,
      dbTiersOverride: overrides ?? null,
    });
  }, [enabled, args.tour, args.composition, args.addOns, overrides]);

  return { quote, loading: isLoading };
}
