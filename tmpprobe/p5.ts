import { REGION_STOP_POOL } from "../src/data/regionStopPool";
const want:Record<string,string[]> = {
 "arrabida-wine-allinclusive":["azeitao","jose-maria"],
 "tiles-workshop":["azeitao"],
 "azeitao-cheese":["azeitao"],
 "sintra-cascais":["azenhas"],
 "evora-alentejo":["evora-city"],
 "tomar-coimbra":["tomar"],
 "fatima-nazare-obidos":["nazare"],
 "roman-heritage-alentejo":["vila-alva"],
};
for (const [anchor,keys] of Object.entries(want)) {
  const stops = REGION_STOP_POOL.filter((s:any)=>s.signatureTourId===anchor||(s.sourceTourIds||[]).includes(anchor));
  const cluster = [...new Set(stops.map((s:any)=>s.routeCluster))];
  const region = [...new Set(stops.map((s:any)=>s.region))];
  const hits = REGION_STOP_POOL.filter((s:any)=>keys.some(k=>s.id.includes(k)));
  console.log(anchor, JSON.stringify({cluster,region,hits:hits.map((h:any)=>[h.id,h.region,h.routeCluster,h.subregion,h.coords])}));
}
