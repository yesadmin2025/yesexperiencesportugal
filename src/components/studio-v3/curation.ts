// Studio V3 — curation layer.
// Maps the trilogy (feeling × companions × rhythm) onto a real SignatureTour
// from the catalog. Per the no-invention rule, every Studio reveal is backed
// by a tour that already exists on the site — we never compose fictional
// stops or partners.
//
// Resolution is deterministic: pick a primary tour for the feeling, then
// trim/expand the stop list to the chosen rhythm. The shortlist is also
// surfaced so the next phase can offer "another way" alternatives.

import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";
import type { Companions, Feeling, Rhythm } from "./types";

const FEELING_TO_TOURS: Record<Feeling, string[]> = {
  coastal: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta"],
  "wine-food": ["arrabida-wine-allinclusive", "azeitao-cheese", "evora-alentejo"],
  hidden: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta"],
  romance: ["sintra-cascais", "arrabida-wine-allinclusive", "troia-comporta"],
  family: ["sintra-cascais", "fatima-nazare-obidos", "troia-comporta"],
  culture: ["tomar-coimbra", "tiles-workshop", "fatima-nazare-obidos"],
  adventure: ["arrabida-boat", "wild-beaches-picnic", "troia-comporta"],
  "slow-luxury": ["arrabida-wine-allinclusive", "sintra-cascais", "evora-alentejo"],
};

const RHYTHM_STOP_COUNT: Record<Rhythm, number> = {
  slow: 3,
  balanced: 4,
  full: 5,
  immersive: 6,
};

export interface CuratedMoment {
  index: number;
  label: string;
  story: string;
  image?: string;
  focal?: string;
  lat: number | null;
  lng: number | null;
}

export interface CuratedJourney {
  tour: SignatureTour;
  alternates: SignatureTour[];
  moments: CuratedMoment[];
  /** Region center for the map — first geo-resolvable stop or null. */
  center: { lat: number; lng: number } | null;
}

export function curateJourney(
  feeling: Feeling,
  _companions: Companions, // reserved — used in future copy variants
  rhythm: Rhythm,
): CuratedJourney {
  const ids = FEELING_TO_TOURS[feeling] ?? [];
  const tours = ids
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is SignatureTour => Boolean(t));

  // Fallback — if mapping ever drifts, pick the all-inclusive wine day.
  const primary =
    tours[0] ??
    signatureTours.find((t) => t.id === "arrabida-wine-allinclusive") ??
    signatureTours[0];
  const alternates = tours.slice(1, 3);

  const count = Math.min(RHYTHM_STOP_COUNT[rhythm], primary.stops.length);
  const sliced = primary.stops.slice(0, count);

  const moments: CuratedMoment[] = sliced.map((s, i) => {
    const geo = lookupStop(s.label);
    return {
      index: i,
      label: s.label,
      story: s.story,
      image: s.image,
      focal: s.focal,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
    };
  });

  const firstGeo = moments.find((m) => m.lat !== null && m.lng !== null);
  const center =
    firstGeo && firstGeo.lat !== null && firstGeo.lng !== null
      ? { lat: firstGeo.lat, lng: firstGeo.lng }
      : null;

  return { tour: primary, alternates, moments, center };
}
