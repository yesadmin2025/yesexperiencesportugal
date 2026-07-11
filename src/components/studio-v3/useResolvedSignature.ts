// useResolvedSignature — Studio V3 authoritative quote hook.
//
// Rules (Pass 1 §1 + §4):
//   1. Never queries the edge function before phase === "confirmation"
//      (finalSignature) / "guestDetails" / "checkoutSummary".
//   2. Snapshot revision changes → previous quote token is discarded, CTA
//      is gated back to loading.
//   3. Mid-refine keystrokes are debounced so mid-drag edits don't queue
//      up quote requests when the guest later re-enters finalSignature.
//   4. Client never invents an authoritative total; if pricing.status is
//      not "quoted", payment stays disabled.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStudioQuote,
  type StudioQuoteResponse,
  type StudioQuoteSnapshot,
} from "@/lib/studio-v3/quoteClient";

type PhaseLike = string;

const QUOTE_ENABLED_PHASES = new Set<PhaseLike>([
  // legacy alias for "finalSignature"
  "confirmation",
  "finalSignature",
  "guestDetails",
  "checkoutSummary",
  "checkout",
]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = walk((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export interface UseResolvedSignatureInput {
  phase: PhaseLike;
  snapshot: StudioQuoteSnapshot | null;
  /** Debounce for revision recomputation (ms). Default 250. */
  debounceMs?: number;
}

export interface ResolvedSignatureState {
  revision: string | null;
  snapshot: StudioQuoteSnapshot | null;
  isEnabled: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  quote: StudioQuoteResponse | null;
  /** True when quote is stale relative to current revision. */
  isStale: boolean;
}

export function useResolvedSignature(
  input: UseResolvedSignatureInput,
): ResolvedSignatureState {
  const { phase, snapshot, debounceMs = 250 } = input;
  const [debouncedRevision, setDebouncedRevision] = useState<string | null>(null);

  // Compute revision from snapshot (debounced to swallow mid-drag edits)
  useEffect(() => {
    if (!snapshot) {
      setDebouncedRevision(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const rev = (await sha256Hex(canonicalJson(snapshot))).slice(0, 16);
        if (!cancelled) setDebouncedRevision(rev);
      } catch {
        if (!cancelled) setDebouncedRevision(null);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [snapshot, debounceMs]);

  const snapshotComplete = !!(
    snapshot &&
    snapshot.commercialProductKey &&
    snapshot.date &&
    snapshot.guests >= 1 &&
    snapshot.routeStops.length >= 1
  );

  const isEnabled =
    QUOTE_ENABLED_PHASES.has(phase) && snapshotComplete && debouncedRevision !== null;

  const query = useQuery({
    queryKey: ["studio-quote", debouncedRevision],
    queryFn: () => fetchStudioQuote(snapshot as StudioQuoteSnapshot),
    enabled: isEnabled,
    staleTime: 0,
    gcTime: 60_000,
    retry: 1,
  });

  return useMemo<ResolvedSignatureState>(() => {
    const quote = query.data ?? null;
    const isStale = quote != null && debouncedRevision != null && quote.revision !== debouncedRevision;
    return {
      revision: debouncedRevision,
      snapshot,
      isEnabled,
      isLoading: query.isLoading && isEnabled,
      isFetching: query.isFetching,
      error: (query.error as Error) ?? null,
      quote: isStale ? null : quote,
      isStale,
    };
  }, [query.data, query.isLoading, query.isFetching, query.error, debouncedRevision, snapshot, isEnabled]);
}
