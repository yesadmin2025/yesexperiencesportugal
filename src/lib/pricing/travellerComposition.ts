// Simple traveller composition — adults + explicit ages for minors.
// No external category mapping. Age bands are resolved by ageBands.ts.

import { AGE_BANDS, bandForAge, type AgeBand } from "./ageBands";

export interface TravellerComposition {
  adults: number;
  minorAges: number[];
}

export const EMPTY_COMPOSITION: TravellerComposition = { adults: 0, minorAges: [] };

export function totalParticipants(c: TravellerComposition): number {
  return Math.max(0, c.adults) + c.minorAges.length;
}

export function countByBand(c: TravellerComposition): Record<AgeBand, number> {
  const counts: Record<AgeBand, number> = { adult: c.adults, youth: 0, child: 0, infant: 0 };
  for (const age of c.minorAges) {
    const band = bandForAge(age).band;
    if (band === "adult") counts.adult += 1;
    else counts[band] += 1;
  }
  return counts;
}

/** Party size used for per-pax tier resolution. Infants excluded. */
export function billableParticipants(c: TravellerComposition): number {
  const counts = countByBand(c);
  return counts.adult + counts.youth + counts.child;
}

export { AGE_BANDS, bandForAge };
