import { signatureTours } from '../src/data/signatureTours.ts';
import { getViatorMeta } from '../src/data/signatureToursViator.ts';
import { validateTour } from '../src/lib/viatorValidation.ts';

for (const t of signatureTours) {
  const v = validateTour(t, getViatorMeta(t.id));
  if (v.severity === 'clean' || !v.hasViatorMeta) continue;
  console.log('\n===', t.id, '[', v.severity, ']');
  if (v.stops.onlyInternal.length) console.log('  stops onlyInternal:', v.stops.onlyInternal);
  if (v.stops.onlyViator.length) console.log('  stops onlyViator:', v.stops.onlyViator);
  if (v.included.onlyInternal.length) console.log('  inc onlyInternal:', v.included.onlyInternal);
  if (v.included.onlyViator.length) console.log('  inc onlyViator:', v.included.onlyViator);
}
