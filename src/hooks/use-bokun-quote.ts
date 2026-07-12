// Client hook wrapping the `bokun-quote` edge function.
//
// The edge function is the SINGLE upstream source of price truth. This hook
// debounces changes to date / startTime / guestMix, invokes the function,
// and returns the resulting quote (including the signed quoteToken that
// checkout must echo back to bokun-signature-create-session).

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GuestMix } from "@/lib/pricing/ageBandPricing";
import type {
  MappedBokunPricingCategory,
  PricingMode,
} from "@/lib/pricing/bokunCategories";

export type BokunQuoteLine = {
  uiBand: "adult" | "youth" | "child" | "infant";
  bokunCategoryId: string;
  label: string;
  ageRange?: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  countsTowardCapacity: boolean;
};

export type BokunQuoteResponse = {
  ok: boolean;
  reason?: string;
  source: string;
  currency: "EUR";
  internalProductKey: string;
  bokunProductId: string | null;
  availabilityId: string | null;
  date: string;
  startTime: string | null;
  pricingPartySize: number;
  totalParticipants: number;
  guestMix: GuestMix;
  bokunCategories: MappedBokunPricingCategory[];
  lines: BokunQuoteLine[];
  addOnLines: Array<{ id: string; label: string; quantity: number; unitEur: number; subtotalEur: number }>;
  finalTotalEur: number;
  quoteToken: string | null;
  expiresAt: string | null;
  pricingMode: PricingMode | null;
  warnings: string[];
};

export type UseBokunQuoteArgs = {
  internalProductKey: string;
  date: string | null;
  startTime?: string | null;
  availabilityId?: string | null;
  guestMix: Partial<GuestMix>;
  signatureRevision?: string;
  enabled?: boolean;
  debounceMs?: number;
};

type State = {
  loading: boolean;
  data: BokunQuoteResponse | null;
  error: string | null;
};

export function useBokunQuote(args: UseBokunQuoteArgs): State & { refresh: () => void } {
  const {
    internalProductKey,
    date,
    startTime = null,
    availabilityId = null,
    guestMix,
    signatureRevision = "r0",
    enabled = true,
    debounceMs = 350,
  } = args;

  const totalGuests =
    (guestMix.adults ?? 0) +
    (guestMix.youths ?? 0) +
    (guestMix.children ?? 0) +
    (guestMix.infants ?? 0);

  const ready = enabled && !!internalProductKey && !!date && totalGuests > 0;

  const [state, setState] = useState<State>({ loading: false, data: null, error: null });
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const key = useMemo(
    () =>
      JSON.stringify({
        internalProductKey,
        date,
        startTime,
        availabilityId,
        guestMix,
        signatureRevision,
        tick,
      }),
    [internalProductKey, date, startTime, availabilityId, guestMix, signatureRevision, tick],
  );

  useEffect(() => {
    if (!ready) {
      setState({ loading: false, data: null, error: null });
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { data, error } = await supabase.functions.invoke("bokun-quote", {
          body: {
            internalProductKey,
            date,
            startTime: startTime ?? undefined,
            availabilityId: availabilityId ?? undefined,
            guestMix,
            signatureRevision,
          },
        });
        if (ac.signal.aborted) return;
        if (error) throw error;
        setState({ loading: false, data: data as BokunQuoteResponse, error: null });
      } catch (e) {
        if (ac.signal.aborted) return;
        setState({
          loading: false,
          data: null,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }, debounceMs);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, debounceMs]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
