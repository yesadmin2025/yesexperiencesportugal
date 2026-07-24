import { signatureTours } from "../src/data/signatureTours.ts";
import { lookupStop } from "../src/data/stopGeo.ts";
for (const t of signatureTours) {
  const stops = t.stops ?? [];
  const missing = stops.filter(s => !lookupStop(s.label));
  const resolved = stops.length - missing.length;
  const status = resolved === 0 ? "NO_MAP" : (missing.length > 0 ? "partial" : "ok");
  console.log(status, t.id, `(${resolved}/${stops.length})`, missing.map(m=>m.label).join(" | "));
}
