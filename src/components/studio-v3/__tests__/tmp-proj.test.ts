import { it } from "vitest";
import { projectAuthoredAnchorStops } from "../authoredAnchorProjection";
import { signatureTours } from "@/data/signatureTours";
it("projects", () => {
  for (const t of signatureTours) {
    const r = projectAuthoredAnchorStops(t.id, t.stops);
    console.log(t.id, t.stops.length, "->", r.points.length, r.provable, JSON.stringify(r.points.map(p=>p.label)));
  }
});
