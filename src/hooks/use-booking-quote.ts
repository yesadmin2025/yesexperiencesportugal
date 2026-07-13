// Provider-neutral quote hook — one for Signature, Tailored, Studio.
//
// Debounces price-affecting inputs, invokes the launch-spec `booking-quote`
// edge function, and returns the signed BookingQuote (available) or the
// reason it's unavailable. Never exposes prices as authoritative to the
// browser: the returned quoteToken is the only artefact checkout can trust.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computePricingRevision,
  type BookingFlow,
  type BookingQuote,
  type BookingQuoteResponse,
  type BookingQuoteUnavailable,
} from "@/lib/pricing/bookingQuote";
import { type TravellerComposition } from "@/lib/pricing/travellerComposition";

export type UseBookingQuoteArgs = {
  flow: BookingFlow;
  commercialProductKey: string;
  date: string | null;
  startTime?: string | null;
  availabilityId?: string | null;
  composition: TravellerComposition;
  selectedAddOns?: Array<{ id: string; quantity: number }>;
  itineraryRevision?: string;
  itinerarySnapshot?: { title: string; routeStops: Array<{ id: string; label: string }> };
  enabled?: boolean;
  debounceMs?: number;
};

export type UseBookingQuoteState = {
  loading: boolean;
  quote: BookingQuote | null;
  unavailable: BookingQuoteUnavailable | null;
  error: string | null;
  pricingRevision: string;
};

export function useBookingQuote(args: UseBookingQuoteArgs): UseBookingQuoteState & { refresh: () => void } {
  const {
    flow,
    commercialProductKey,
    date,
    startTime = null,
    availabilityId = null,
    composition,
    selectedAddOns = [],
    itineraryRevision,
    itinerarySnapshot,
    enabled = true,
    debounceMs = 300,
  } = args;

  const totalGuests = composition.adults + composition.minorAges.length;
  const ready = enabled && !!commercialProductKey && !!date && totalGuests > 0;

  const pricingRevision = useMemo(
    () =>
      computePricingRevision({
        commercialProductKey,
        date: date ?? "",
        startTime,
        availabilityId,
        adults: composition.adults,
        minorAges: composition.minorAges,
        addOns: selectedAddOns,
      }),
    [commercialProductKey, date, startTime, availabilityId, composition.adults, composition.minorAges, selectedAddOns],
  );

  const [state, setState] = useState<UseBookingQuoteState>({
    loading: false,
    quote: null,
    unavailable: null,
    error: null,
    pricingRevision,
  });
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!ready) {
      setState({ loading: false, quote: null, unavailable: null, error: null, pricingRevision });
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setState((s) => ({ ...s, loading: true, error: null, pricingRevision }));
      try {
        const { data, error } = await supabase.functions.invoke("booking-quote", {
          body: {
            flow,
            commercialProductKey,
            date,
            startTime: startTime ?? undefined,
            availabilityId: availabilityId ?? undefined,
            travellerComposition: composition,
            addOns: selectedAddOns.filter((a) => a.quantity > 0),
            pricingRevision,
            itineraryRevision,
            itinerarySnapshot,
          },
        });
        if (ac.signal.aborted) return;
        if (error) throw error;
        const resp = data as BookingQuoteResponse;
        if (resp.availabilityStatus === "available") {
          setState({ loading: false, quote: resp as BookingQuote, unavailable: null, error: null, pricingRevision });
        } else {
          setState({ loading: false, quote: null, unavailable: resp as BookingQuoteUnavailable, error: null, pricingRevision });
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setState({
          loading: false,
          quote: null,
          unavailable: null,
          error: e instanceof Error ? e.message : String(e),
          pricingRevision,
        });
      }
    }, debounceMs);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingRevision, itineraryRevision, ready, debounceMs, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
