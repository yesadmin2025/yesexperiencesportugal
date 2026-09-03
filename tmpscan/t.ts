import { signatureTours } from "../src/data/signatureTours";
import { lookupStop } from "../src/data/stopGeo";
for (const t of signatureTours) {
  const s = (t.stops ?? []).map((x) => {
    const h = lookupStop(x.label);
    return h ? `${h.label}` : `MISS(${x.label})`;
  });
  console.log(t.id, "::", s.join(" | "));
}
