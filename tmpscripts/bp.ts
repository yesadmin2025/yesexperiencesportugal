import { TAILOR_BLUEPRINTS } from "../src/data/tailorBlueprints";
const bps: any = TAILOR_BLUEPRINTS as any;
const list = Array.isArray(bps) ? bps : Object.values(bps);
for (const b of list as any[]) {
  console.log("==", b.tourId, "choice:", b.choice ? `${b.choice.pickMin}-${b.choice.pickMax} (${b.choice.options.length} opts)` : "none");
  for (const s of b.core) console.log("   core", s.id, "|", s.category, "|", s.lock ? "LOCK:"+s.lock.reasonCode : "unlocked", "|", s.label);
}
