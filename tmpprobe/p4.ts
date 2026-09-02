import { TAILOR_BLUEPRINTS } from "../src/data/tailorBlueprints";
for (const [k,bp] of Object.entries<any>(TAILOR_BLUEPRINTS as any)) {
  const lunches = [...(bp.core??[]),...(bp.optional??[]),...((bp.choice?.options)??[])].filter((s:any)=>s.category==="lunch");
  console.log(k, JSON.stringify(lunches.map((l:any)=>({id:l.id,label:l.label,blurb:l.blurb,dwell:l.dwellMinutesOverride, core: (bp.core??[]).some((c:any)=>c.id===l.id)}))));
}
