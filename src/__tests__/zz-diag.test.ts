import { it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { resolveStudioV3Route } from "@/components/studio-v3/curation";
import { setComposableStopAuthority } from "@/lib/studio-v3/composableStopAuthority";
it("diag", async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await sb.from("studio_composable_stops").select("*");
  console.log("rows", data?.length, error?.message);
  setComposableStopAuthority((data??[]).map((r:any)=>({stopId:r.stop_id,region:r.region,priceCents:r.price_cents,pricingUnit:r.pricing_unit,minGuests:r.min_guests,active:r.active,notes:r.notes,durationMinutes:r.duration_minutes,openFrom:r.open_from?.slice(0,5)??null,openTo:r.open_to?.slice(0,5)??null,fixedStartTimes:(r.fixed_start_times??[]).map((v:string)=>v.slice(0,5)),durationOptionsMinutes:r.duration_options_minutes??[],quantityOptions:r.quantity_options??[]})));
  const profiles:any[] = [
    {feeling:"wine-food",interests:["gastronomy","coast"]},
    {feeling:"wine-food",interests:["wine","hands-on","coast"]},{feeling:"nature",interests:["coast","hands-on"],destinationIntent:"arrabida"},{feeling:"wine-food",interests:["wine","coast"],rhythm:"slow"},
    {feeling:"nature",interests:["coast","nature"]},
    {feeling:"culture",interests:["heritage","hands-on"]},
  ];
  for (const p of profiles) {
    const r:any = resolveStudioV3Route({ companions:"couple", rhythm:p.rhythm??"balanced", pickup:"lisbon", dateExact:"2026-10-28", ...p, rhythm:p.rhythm??"balanced" });
    const lb = r.livingAtlas ?? r.livingAtlasLive ?? {};
    console.log(JSON.stringify({p, tour:r.skeletonTourKey, pts:(r.routePoints??[]).map((x:any)=>x.label), fb: lb.fallbackReason, comp:(r.composedRoutePoints??[]).map((x:any)=>x.label), keys:Object.keys(r).join(",")}));
  }
});
