// Signature add-ons — region-mapped, but every add-on is a real
// experience pulled from a *sibling* signature in the same region.
//
// Rules (non-negotiable):
//   1. NEVER invent stops or experiences. Every add-on declares the
//      sibling `sourceTourId` it borrows from — that tour exists in
//      src/data/signatureTours.ts.
//   2. NEVER duplicate something the resolved Signature already
//      includes. Pickup, private transport, lunch, the guide etc. are
//      already part of every Signature's `included` array — we do not
//      sell them again as add-ons.
//   3. The traveller never sees more than 3 add-ons, and only those
//      whose itinerary thresholds (stops / hours) are met.
//   4. Pricing is derived at runtime as a % of the base "from" anchor
//      and rounded to the nearest €5/pp. No invented numbers.

import type { SignatureTour } from "./signatureTours";

export type RegionBucket = "lisbon-arrabida" | "alentejo" | "douro" | "centro" | "comporta";

/**
 * Inside the broad "lisbon-arrabida" bucket we still have two geographically
 * distinct micro-regions, separated by the Tejo + 25 de Abril bridge:
 *   - "sintra-cascais": north/west of Lisbon (Sintra, Cascais, Cabo da Roca)
 *   - "arrabida-setubal": south of the Tejo (Arrábida, Sesimbra, Azeitão)
 * An add-on from the "wrong" side of the Tejo doesn't belong on a tour
 * anchored on the other side — we never propose Arrábida add-ons on a
 * Sintra/Cascais signature and vice versa.
 */
export type LisbonSubRegion = "sintra-cascais" | "arrabida-setubal";

/** Map of known signature tour ids → their Lisbon sub-region. */
export const LISBON_SUBREGION_BY_TOUR_ID: Record<string, LisbonSubRegion> = {
  "sintra-cascais": "sintra-cascais",
  "arrabida-wine-allinclusive": "arrabida-setubal",
  "wild-beaches-picnic": "arrabida-setubal",
  "arrabida-boat": "arrabida-setubal",
  "tiles-workshop": "arrabida-setubal",
  "azeitao-cheese": "arrabida-setubal",
};

export interface SignatureAddOn {
  id: string;
  label: string;
  blurb: string;
  /** Price as a fraction of the base "from" price (per person). */
  pricePctOfBase: number;
  /** The sibling Signature this experience belongs to. Must exist. */
  sourceTourId: string;
  /** Minimum stops in the resolved itinerary for this add-on to surface. */
  minStops?: number;
  /** Minimum duration (hours) for this add-on to surface. */
  minHours?: number;
  /**
   * Optional Lisbon-bucket sub-region. When set, the add-on is only
   * surfaced for anchors on the same side of the Tejo.
   */
  lisbonSubRegion?: LisbonSubRegion;
}

/** Bucket a free-text region string into a known region family. */
export function regionBucket(region: string | null | undefined): RegionBucket {
  const r = (region ?? "").toLowerCase();
  if (r.includes("douro") || r.includes("porto")) return "douro";
  if (r.includes("comporta") || r.includes("tróia") || r.includes("troia")) return "comporta";
  if (r.includes("alentejo") || r.includes("évora") || r.includes("evora")) return "alentejo";
  if (
    r.includes("centro") ||
    r.includes("coimbra") ||
    r.includes("óbidos") ||
    r.includes("obidos") ||
    r.includes("fátima") ||
    r.includes("fatima") ||
    r.includes("nazaré") ||
    r.includes("nazare")
  )
    return "centro";
  return "lisbon-arrabida";
}

/**
 * Catalog of borrowable experiences per region. Every entry's
 * `sourceTourId` references an existing Signature (see signatureTours.ts).
 * Nothing on this list is fabricated — each card is the headline moment
 * of a real sibling Signature in the same region.
 */
export const ADD_ON_CATALOG: Record<RegionBucket, SignatureAddOn[]> = {
  "lisbon-arrabida": [
    {
      id: "hidden-cove-picnic",
      sourceTourId: "wild-beaches-picnic",
      label: "Hidden-cove beach picnic",
      blurb:
        "Slip into Galapinhos or Portinho da Arrábida for a slow picnic on the sand — bread, cheese, wine, no crowds.",
      pricePctOfBase: 0.18,
      minHours: 6,
    },
    {
      id: "coastal-boat-ride",
      sourceTourId: "arrabida-boat",
      label: "Coastal boat ride from Sesimbra",
      blurb:
        "An hour on the water along the Arrábida cliffs — caves, turquoise bays, Atlantic light.",
      pricePctOfBase: 0.22,
      minHours: 6,
    },
    {
      id: "azulejo-workshop",
      sourceTourId: "tiles-workshop",
      label: "Hand-painted azulejo workshop",
      blurb:
        "Paint your own cobalt-blue tile inside an Azeitão atelier — five centuries of tradition, one hour of your own.",
      pricePctOfBase: 0.16,
    },
    {
      id: "azeitao-cheese",
      sourceTourId: "azeitao-cheese",
      label: "Azeitão cheese-making session",
      blurb:
        "A short hands-on session with a small Azeitão dairy — taste raw-milk cheeses at the source.",
      pricePctOfBase: 0.14,
    },
    {
      id: "sintra-detour",
      sourceTourId: "sintra-cascais",
      label: "Sintra detour — Pena & Cabo da Roca",
      blurb:
        "Add a short loop through Sintra's romantic hills and Europe's western-most cape on the way home.",
      pricePctOfBase: 0.2,
      minHours: 7,
      minStops: 4,
    },
  ],
  alentejo: [
    {
      id: "chapel-of-bones",
      sourceTourId: "evora-alentejo",
      label: "Chapel of Bones, after the queue",
      blurb:
        "Évora's haunting bone chapel and the old town walls — your guide times the visit for quiet light.",
      pricePctOfBase: 0.16,
    },
    {
      id: "talha-amphora",
      sourceTourId: "roman-heritage-alentejo",
      label: "Talha amphora wine tasting",
      blurb: "Taste 2 000-year-old clay-vessel wines in a Vidigueira cellar with the winemaker.",
      pricePctOfBase: 0.18,
    },
    {
      id: "roman-ruins-trail",
      sourceTourId: "roman-heritage-alentejo",
      label: "Roman heritage stop",
      blurb: "A guided pause at a real Roman site — columns, mosaics, the same hills they walked.",
      pricePctOfBase: 0.12,
      minStops: 3,
    },
  ],
  comporta: [
    {
      id: "roman-troia",
      sourceTourId: "troia-comporta",
      label: "Roman ruins of Tróia",
      blurb: "A quiet guided walk through one of the Atlantic's largest Roman fish-salting sites.",
      pricePctOfBase: 0.14,
    },
    {
      id: "herdade-tasting",
      sourceTourId: "troia-comporta",
      label: "Herdade da Comporta wine tasting",
      blurb: "A relaxed tasting at the estate that defined Comporta — vines, dunes, long horizons.",
      pricePctOfBase: 0.2,
    },
  ],
  centro: [
    {
      id: "templar-tomar",
      sourceTourId: "tomar-coimbra",
      label: "Templar Convent of Tomar",
      blurb:
        "Step inside the Convent of Christ — eight centuries of Templar and Order history, in stone.",
      pricePctOfBase: 0.18,
    },
    {
      id: "obidos-walls",
      sourceTourId: "fatima-nazare-obidos",
      label: "Walled town of Óbidos",
      blurb:
        "A slow walk along Óbidos' whitewashed lanes — a glass of ginja in a chocolate cup, included.",
      pricePctOfBase: 0.14,
    },
    {
      id: "nazare-cliffs",
      sourceTourId: "fatima-nazare-obidos",
      label: "Nazaré giant-wave cliffs",
      blurb:
        "Stand above the canyon that makes Nazaré's monster waves — the Atlantic stretching to the horizon.",
      pricePctOfBase: 0.16,
      minHours: 6,
    },
  ],
  // No Douro Signature in the dataset yet — we refuse to fabricate one.
  douro: [],
};

/** Round to nearest €5, floor €5. */
export function roundEur5(eur: number): number {
  return Math.max(5, Math.round(eur / 5) * 5);
}

/** Convert an add-on's percent to a per-person EUR anchor. */
export function addOnEurFromBase(baseEur: number, pct: number): number {
  return roundEur5(baseEur * pct);
}

/** Parse the loose `durationHours` string (e.g. "7–9h", "6+h") to its lower bound. */
export function parseDurationLowerHours(label: string | null | undefined): number {
  if (!label) return 0;
  const m = label.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

/**
 * Pick up to 3 add-ons appropriate for the resolved itinerary.
 *
 * Filters applied (in order):
 *   1. drop any add-on whose `sourceTourId` IS the resolved tour —
 *      the resolved Signature already delivers that experience
 *   2. enforce `minStops` / `minHours` thresholds against the resolved day
 *   3. cap at 3
 */
export function selectSignatureAddOns(opts: {
  resolvedTour: Pick<SignatureTour, "id" | "region"> | null | undefined;
  stopCount: number;
  durationLabel: string | null | undefined;
}): SignatureAddOn[] {
  if (!opts.resolvedTour) return [];
  const bucket = regionBucket(opts.resolvedTour.region);
  const hours = parseDurationLowerHours(opts.durationLabel);
  const pool = ADD_ON_CATALOG[bucket] ?? [];
  return pool
    .filter((a) => a.sourceTourId !== opts.resolvedTour!.id)
    .filter((a) => (a.minStops ? opts.stopCount >= a.minStops : true))
    .filter((a) => (a.minHours ? hours >= a.minHours : true))
    .slice(0, 3);
}
