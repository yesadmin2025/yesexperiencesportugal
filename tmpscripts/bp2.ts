import { TAILOR_BLUEPRINTS } from "../src/data/tailorBlueprints";
for (const b of Object.values(TAILOR_BLUEPRINTS as any) as any[]) {
  if (!b.choice) continue;
  console.log("==", b.tourId, b.choice.pickMin, b.choice.pickMax, b.choice.label);
  for (const o of b.choice.options) console.log("   ", o.id, o.category, o.upchargePerPaxEUR ?? "");
}
