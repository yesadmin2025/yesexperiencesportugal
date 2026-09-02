import { REGION_STOP_POOL } from "../src/data/regionStopPool";
for (const id of ["azeitao-village","azenhas-do-mar","evora-city","tomar-historic-center","nazare-town","vila-alva","comporta-village"]) {
  const s:any = REGION_STOP_POOL.find((x:any)=>x.id===id);
  console.log(id, s?.coords?.lat, s?.coords?.lng, s?.region, s?.routeCluster, s?.subregion, JSON.stringify(s?.suitsInterests));
}
