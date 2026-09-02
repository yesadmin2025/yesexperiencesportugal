import { REGION_STOP_POOL } from "@/data/regionStopPool";
console.log(REGION_STOP_POOL.filter(s=>s.type==="table").map(s=>`${s.id}:${s.region}`).join("\n"));
