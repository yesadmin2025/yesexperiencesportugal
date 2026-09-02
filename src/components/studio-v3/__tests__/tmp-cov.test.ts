import { describe, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { scoreTourFit } from "@/components/studio-v3/curation";
describe("cov", () => {
  it("dump", () => {
    const interests = ["wine","gastronomy","nature","coast","heritage","photography","wellness","local-life","faith","hands-on"] as const;
    for (const t of signatureTours) {
      const fit = scoreTourFit(t as any, { feeling: "culture", companions: "couple", interests: interests as any, pickup: null, rhythm: null, destinationIntent: null } as any);
      const sat = fit.coverage.interests.filter((c:any)=>c.satisfied).map((c:any)=>`${c.interest}:${c.strength}`);
      console.log(t.id, "|", sat.join(","));
    }
  });
});
