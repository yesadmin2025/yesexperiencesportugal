import { it } from "vitest";
import { semanticStopKey } from "@/components/studio-v3/curation";
it("keys", () => {
  for (const l of ["House & Museum José Maria Da Fonseca","José Maria da Fonseca","Adega Coop. de Palmela, C.R.L.","Adega Cooperativa de Palmela","Bacalhoa Vinhos de Portugal","Bacalhôa","Farm Catralvos","Quinta de Catralvos","Azeitão","Quinta do Piloto"])
    console.log(JSON.stringify(l), "=>", semanticStopKey(l));
});
