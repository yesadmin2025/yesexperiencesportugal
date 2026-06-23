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
//      whose itinerary thresholds (stops / hours / remaining time) are
//      met.
//   4. Pricing is derived at runtime as a % of the base "from" anchor
//      and rounded to the nearest €5/pp. No invented numbers.
//   5. `durationMinutes` is the time the add-on costs the day. The
//      caller passes `remainingMinutes` (regional far-budget minus
//      already-planned stops + drives) and we tag each add-on with
//      `fitsBudget` so the UI can dim toggles that would push the day
//      past the regional rhythm.

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

/**
 * Vocabulary used to detect when a Signature already delivers what an
 * add-on would propose. Keep this list short and orthogonal — every tag
 * must be detectable from the tour's existing `included[]` strings via
 * `deriveInclusionTags`, and every add-on's `conflictsWith` must use the
 * same vocabulary.
 */
export type InclusionTag =
  | "lunch"
  | "picnic"
  | "wine-tasting"
  | "boat"
  | "azulejo"
  | "cheese"
  | "roman"
  | "sintra"
  | "evora"
  | "tomar"
  | "obidos"
  | "nazare";

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
   * Minutes this add-on adds to the day (driving included where it would
   * meaningfully change the budget). Used by the time-budget guard so we
   * never suggest a stop that would push the day past the regional cap.
   */
  durationMinutes: number;
  /**
   * Optional Lisbon-bucket sub-region. When set, the add-on is only
   * surfaced for anchors on the same side of the Tejo.
   */
  lisbonSubRegion?: LisbonSubRegion;
  /**
   * Inclusion tags that, if already delivered by the resolved Signature,
   * make this add-on redundant or contradictory (e.g. a picnic add-on on
   * a tour that already includes lunch). The selector drops these.
   */
  conflictsWith?: InclusionTag[];
}

/**
 * Derive a set of `InclusionTag`s from a Signature tour's `included[]`
 * strings + its id (some Signatures have descriptive ids like
 * `wild-beaches-picnic` that imply tags the prose may not spell out).
 *
 * Conservative on purpose — we'd rather miss a redundant add-on than
 * silently drop a legitimate one. Tags only fire on unambiguous matches.
 */
export function deriveInclusionTags(input: {
  id?: string | null;
  included?: ReadonlyArray<string> | null;
}): Set<InclusionTag> {
  const tags = new Set<InclusionTag>();
  const corpus = ((input.included ?? []).join(" ") + " " + (input.id ?? "")).toLowerCase();
  const has = (re: RegExp) => re.test(corpus);

  if (has(/\blunch\b|wine pairing|paired lunch|long lunch|gastronom/)) tags.add("lunch");
  if (has(/\bpicnic\b/)) tags.add("picnic");
  if (has(/winery|wine tasting|wine experience|cellar tasting|vineyard tasting|tasting at|wine pairing/))
    tags.add("wine-tasting");
  if (has(/\bboat\b|kayak|sail|dolphin|snorkel/)) tags.add("boat");
  if (has(/azulejo|tile workshop|tile-painting|hand-painted tile/)) tags.add("azulejo");
  if (has(/\bcheese\b/)) tags.add("cheese");
  if (has(/roman ruin|roman heritage|roman site|tróia ruin|troia ruin/)) tags.add("roman");
  if (has(/sintra|pena palace|cabo da roca/)) tags.add("sintra");
  if (has(/évora|evora|chapel of bones/)) tags.add("evora");
  if (has(/tomar|convent of christ|templar/)) tags.add("tomar");
  if (has(/óbidos|obidos/)) tags.add("obidos");
  if (has(/nazaré|nazare/)) tags.add("nazare");

  return tags;
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
      durationMinutes: 90,
      lisbonSubRegion: "arrabida-setubal",
      conflictsWith: ["picnic", "lunch"],
    },
    {
      id: "coastal-boat-ride",
      sourceTourId: "arrabida-boat",
      label: "Coastal boat ride from Sesimbra",
      blurb:
        "An hour on the water along the Arrábida cliffs — caves, turquoise bays, Atlantic light.",
      pricePctOfBase: 0.22,
      minHours: 6,
      durationMinutes: 75,
      lisbonSubRegion: "arrabida-setubal",
      conflictsWith: ["boat"],
    },
    {
      id: "azulejo-workshop",
      sourceTourId: "tiles-workshop",
      label: "Hand-painted azulejo workshop",
      blurb:
        "Paint your own cobalt-blue tile inside an Azeitão atelier — five centuries of tradition, one hour of your own.",
      pricePctOfBase: 0.16,
      durationMinutes: 90,
      lisbonSubRegion: "arrabida-setubal",
      conflictsWith: ["azulejo"],
    },
    {
      id: "azeitao-cheese",
      sourceTourId: "azeitao-cheese",
      label: "Azeitão cheese-making session",
      blurb:
        "A short hands-on session with a small Azeitão dairy — taste raw-milk cheeses at the source.",
      pricePctOfBase: 0.14,
      durationMinutes: 60,
      lisbonSubRegion: "arrabida-setubal",
      conflictsWith: ["cheese"],
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
      durationMinutes: 120,
      lisbonSubRegion: "sintra-cascais",
      conflictsWith: ["sintra"],
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
      durationMinutes: 60,
      conflictsWith: ["evora"],
    },
    {
      id: "talha-amphora",
      sourceTourId: "roman-heritage-alentejo",
      label: "Talha amphora wine tasting",
      blurb: "Taste 2 000-year-old clay-vessel wines in a Vidigueira cellar with the winemaker.",
      pricePctOfBase: 0.18,
      durationMinutes: 75,
      conflictsWith: ["wine-tasting"],
    },
    {
      id: "roman-ruins-trail",
      sourceTourId: "roman-heritage-alentejo",
      label: "Roman heritage stop",
      blurb: "A guided pause at a real Roman site — columns, mosaics, the same hills they walked.",
      pricePctOfBase: 0.12,
      minStops: 3,
      durationMinutes: 45,
      conflictsWith: ["roman"],
    },
  ],
  comporta: [
    {
      id: "roman-troia",
      sourceTourId: "troia-comporta",
      label: "Roman ruins of Tróia",
      blurb: "A quiet guided walk through one of the Atlantic's largest Roman fish-salting sites.",
      pricePctOfBase: 0.14,
      durationMinutes: 60,
      conflictsWith: ["roman"],
    },
    {
      id: "herdade-tasting",
      sourceTourId: "troia-comporta",
      label: "Herdade da Comporta wine tasting",
      blurb: "A relaxed tasting at the estate that defined Comporta — vines, dunes, long horizons.",
      pricePctOfBase: 0.2,
      durationMinutes: 75,
      conflictsWith: ["wine-tasting"],
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
      durationMinutes: 75,
      conflictsWith: ["tomar"],
    },
    {
      id: "obidos-walls",
      sourceTourId: "fatima-nazare-obidos",
      label: "Walled town of Óbidos",
      blurb:
        "A slow walk along Óbidos' whitewashed lanes — a glass of ginja in a chocolate cup, included.",
      pricePctOfBase: 0.14,
      durationMinutes: 60,
      conflictsWith: ["obidos"],
    },
    {
      id: "nazare-cliffs",
      sourceTourId: "fatima-nazare-obidos",
      label: "Nazaré giant-wave cliffs",
      blurb:
        "Stand above the canyon that makes Nazaré's monster waves — the Atlantic stretching to the horizon.",
      pricePctOfBase: 0.16,
      minHours: 6,
      durationMinutes: 45,
      conflictsWith: ["nazare"],
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
 *   2. inside the "lisbon-arrabida" bucket, drop any add-on whose
 *      `lisbonSubRegion` is on the other side of the Tejo from the
 *      anchor (e.g. no Arrábida add-ons on a Sintra/Cascais anchor)
 *   3. drop any add-on whose `conflictsWith` intersects the inclusion
 *      tags derived from the tour's own `included[]` (e.g. a picnic
 *      add-on on a tour that already includes lunch)
 *   4. enforce `minStops` / `minHours` thresholds against the resolved day
 *   5. cap at 3
 */
export function selectSignatureAddOns(opts: {
  resolvedTour:
    | (Pick<SignatureTour, "id" | "region"> & { included?: ReadonlyArray<string> })
    | null
    | undefined;
  stopCount: number;
  durationLabel: string | null | undefined;
}): SignatureAddOn[] {
  if (!opts.resolvedTour) return [];
  const bucket = regionBucket(opts.resolvedTour.region);
  const hours = parseDurationLowerHours(opts.durationLabel);
  const pool = ADD_ON_CATALOG[bucket] ?? [];
  const anchorSub: LisbonSubRegion | undefined =
    bucket === "lisbon-arrabida"
      ? LISBON_SUBREGION_BY_TOUR_ID[opts.resolvedTour.id]
      : undefined;
  const inclusionTags = deriveInclusionTags({
    id: opts.resolvedTour.id,
    included: opts.resolvedTour.included ?? null,
  });
  return pool
    .filter((a) => a.sourceTourId !== opts.resolvedTour!.id)
    .filter((a) => {
      if (bucket !== "lisbon-arrabida") return true;
      if (!anchorSub || !a.lisbonSubRegion) return true;
      return a.lisbonSubRegion === anchorSub;
    })
    .filter((a) => {
      if (!a.conflictsWith || a.conflictsWith.length === 0) return true;
      return !a.conflictsWith.some((tag) => inclusionTags.has(tag));
    })
    .filter((a) => (a.minStops ? opts.stopCount >= a.minStops : true))
    .filter((a) => (a.minHours ? hours >= a.minHours : true))
    .slice(0, 3);
}

/**
 * Same selection as `selectSignatureAddOns`, but each item is tagged with
 * `fitsBudget` against the caller's `remainingMinutes`. The UI keeps the
 * add-on visible (so the traveller still sees the option) but dims it and
 * blocks the toggle when it would push the day past the regional rhythm.
 *
 * When `remainingMinutes` is undefined, every add-on is considered to fit
 * (back-compat path for surfaces that don't yet pass a day summary).
 */
export function selectSignatureAddOnsWithBudget(opts: {
  resolvedTour:
    | (Pick<SignatureTour, "id" | "region"> & { included?: ReadonlyArray<string> })
    | null
    | undefined;
  stopCount: number;
  durationLabel: string | null | undefined;
  remainingMinutes?: number;
}): Array<{ addOn: SignatureAddOn; fitsBudget: boolean }> {
  const list = selectSignatureAddOns({
    resolvedTour: opts.resolvedTour,
    stopCount: opts.stopCount,
    durationLabel: opts.durationLabel,
  });
  const budget = opts.remainingMinutes;
  return list.map((addOn) => ({
    addOn,
    fitsBudget: budget == null ? true : budget >= addOn.durationMinutes,
  }));
}
