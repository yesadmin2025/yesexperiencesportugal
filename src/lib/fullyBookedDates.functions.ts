import { createServerFn } from "@tanstack/react-start";

/** Public: returns only fully booked ISO dates (no guide data). Runs with server privileges. */
export const getFullyBookedDates = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any).rpc("public_fully_booked_dates", { _from: from, _to: to });
  if (error || !Array.isArray(data)) return [] as string[];
  return (data as unknown[]).map((d) => String(d).slice(0, 10));
});
