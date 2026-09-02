import { REGION_STOP_POOL } from "../src/data/regionStopPool";
const c = REGION_STOP_POOL.filter((s:any)=>s.routeCluster==="troia-comporta-coast");
console.log(c.length);
console.log(c.map((s:any)=>[s.id,s.type,s.durationMin,s.signatureTourId,(s.sourceTourIds||[]).join(","),(s.dimensions||[]).join("|")].join(" :: ")).join("\n"));
