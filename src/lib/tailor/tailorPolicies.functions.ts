import { createServerFn } from "@tanstack/react-start";

/**
 * Public read of the Tailor price caps needed for live guest pricing.
 * The table itself is admin-only; this returns just the numeric caps
 * (no admin notes) so guest Tailor pricing keeps working.
 */
export const getTailorPricePolicies = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tailor_price_policies" as never)
    .select("policy_group, max_total_pct, floor_pct_of_base");
  if (error) throw new Error("Tailor pricing is unavailable right now.");
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    policy_group: String(row.policy_group),
    max_total_pct: Number(row.max_total_pct),
    floor_pct_of_base: Number(row.floor_pct_of_base),
  }));
});
