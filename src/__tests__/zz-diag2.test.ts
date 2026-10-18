import { it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
it("d2", async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  const { data } = await sb.from("studio_composable_stops").select("stop_id,region,active,price_cents,duration_minutes,open_from,fixed_start_times");
  const ids = new Set(REGION_STOP_POOL.map(s=>s.id));
  for (const r of data??[]) console.log("ROW", r.stop_id, r.region, ids.has(r.stop_id)?"inPool":"NOTPOOL", r.price_cents, r.duration_minutes, r.open_from, (r.fixed_start_times??[]).length);
  console.log("POOLSIZE", REGION_STOP_POOL.length);
});
