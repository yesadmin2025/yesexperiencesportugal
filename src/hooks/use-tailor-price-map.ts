import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  tailorRuleBookable,
  tailorRuleKey,
  type TailorDirection,
  type TailorPricePolicy,
  type TailorPriceRule,
} from "@/lib/tailor/tailor-price-engine";

export const TAILOR_PRICE_MAP_QUERY_KEY = ["tailor-price-map"] as const;

export interface TailorPriceMapData {
  rules: TailorPriceRule[];
  policies: TailorPricePolicy[];
}

export async function fetchTailorPriceMap(tourId?: string): Promise<TailorPriceMapData> {
  // Table is new; generated types may lag, so the client is narrowed loosely.
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => Promise<{ data: unknown[] | null; error: Error | null }>;
      } & Promise<{ data: unknown[] | null; error: Error | null }>;
    };
  };
  const cols =
    "id, tour_id, action_id, action_kind, direction, label, default_in_day, adjustment_type, adjustment_value, unit, policy_group, active, min_party, max_party, note, updated_at";
  const rulesQuery = tourId ? db.from("tailor_price_rules").select(cols).eq("tour_id", tourId) : db.from("tailor_price_rules").select(cols);
  const [r, p] = await Promise.all([
    rulesQuery,
    db.from("tailor_price_policies").select("policy_group, max_total_pct, floor_pct_of_base, note"),
  ]);
  if (r.error) throw r.error;
  if (p.error) throw p.error;
  return {
    rules: ((r.data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...(row as unknown as TailorPriceRule),
      adjustment_value: row.adjustment_value === null ? null : Number(row.adjustment_value),
    })),
    policies: ((p.data ?? []) as Record<string, unknown>[]).map((row) => ({
      policy_group: String(row.policy_group),
      max_total_pct: Number(row.max_total_pct),
      floor_pct_of_base: Number(row.floor_pct_of_base),
    })),
  };
}

/** Tailor price map for one Signature + a bookability helper. */
export function useTailorPriceMap(tourId: string, headcount: number) {
  const q = useQuery({
    queryKey: [...TAILOR_PRICE_MAP_QUERY_KEY, tourId],
    queryFn: () => fetchTailorPriceMap(tourId),
    staleTime: 60_000,
  });
  const byKey = useMemo(() => {
    const m = new Map<string, TailorPriceRule>();
    for (const r of q.data?.rules ?? []) m.set(tailorRuleKey(r.action_id, r.direction), r);
    return m;
  }, [q.data]);
  const bookable = (actionId: string, direction: TailorDirection) =>
    tailorRuleBookable(byKey.get(tailorRuleKey(actionId, direction)), headcount);
  return { ...q, byKey, bookable };
}
