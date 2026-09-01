import { it } from "vitest";
import { findTour } from "@/data/signatureTours";
import { isWineryStopLabel } from "@/components/studio-v3/studioWineryPresentation";
it("d", () => {
  const t = findTour("arrabida-wine-allinclusive");
  console.log(JSON.stringify(t?.stops, null, 1).slice(0, 1500));
  for (const l of ["Quinta de Catralvos","Casa Ermelinda Freitas","Adega de Palmela","Quinta do Piloto"])
    console.log(l, isWineryStopLabel(l));
});
