import { SIGNATURE_SOURCE_OF_TRUTH } from '../src/data/signatureToursSourceOfTruth.ts';
import { lookupStop } from '../src/data/stopGeo.ts';
import { signatureTours } from '../src/data/signatureTours.ts';
for (const [id, sot] of Object.entries(SIGNATURE_SOURCE_OF_TRUTH)) {
  const tour = signatureTours.find(t=>t.id===id);
  const stops = tour?.stops ?? [];
  const missBP = stops.filter(s => !lookupStop(s.label));
  const missSoT = sot.itinerary.filter(c => !lookupStop(c.label));
  console.log(id, `BP=${stops.length}/miss${missBP.length}`, `SoT=${sot.itinerary.length}/miss${missSoT.length}`);
  if (missBP.length) console.log('  BP miss:', missBP.map(s=>s.label));
  if (missSoT.length) console.log('  SoT miss:', missSoT.map(c=>c.label));
}
