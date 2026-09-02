import { getTailorBlueprint } from "../src/data/tailorBlueprints";
import { bridgedBlueprintStopId } from "../src/data/structuralStopBridge";
const bp:any = getTailorBlueprint("troia-comporta");
console.log("core:", bp?.core.map((s:any)=>s.id+"|"+s.label));
console.log("choice:", bp?.choice?.options?.map((s:any)=>s.id+"|"+s.label));
console.log("optional:", bp?.optional.map((s:any)=>s.id+"|"+s.label));
for (const id of ["comporta-village","marina-de-troia","cais-palafitico-carrasqueira","roman-ruins-troia","herdade-da-comporta"])
  console.log(id, "->", bridgedBlueprintStopId("troia-comporta", id));
