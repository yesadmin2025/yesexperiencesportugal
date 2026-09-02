import { REGION_STOP_POOL } from "../src/data/regionStopPool";
const clusters = ["arrabida-azeitao-sesimbra","sintra-cascais-coast-heritage","troia-comporta-coast","evora-city-classical-wineries","tomar-coimbra-heritage","fatima-nazare-obidos-spirit-coast","vidigueira-roman-talha"];
for (const c of clusters){
  console.log("##",c);
  for (const s of REGION_STOP_POOL.filter((x:any)=>x.routeCluster===c) as any[])
    console.log("  ",s.id,s.subregion,s.coords?`${s.coords.lat},${s.coords.lng}`:"NOCOORDS");
}
