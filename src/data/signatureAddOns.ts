// Signature add-ons — region-mapped, priced as % of base.
//
// Up to three add-ons surface in the Studio reveal. Pricing derives at
// runtime from the resolved base price (no hardcoded prices, no third
// party brand names exposed to the traveller). An add-on only appears
// if the itinerary leaves room for it (duration / stops thresholds).

export type RegionBucket =
  | "lisbon-arrabida"
  | "alentejo"
  | "douro"
  | "centro"
  | "comporta";

export interface SignatureAddOn {
  id: string;
  label: string;
  blurb: string;
  /** Price as a fraction of the base "from" price (per person). */
  pricePctOfBase: number;
  /** Minimum stops for this add-on to be eligible. */
  minStops?: number;
  /** Minimum duration (hours) for this add-on to be eligible. */
  minHours?: number;
}

/** Bucket a free-text region string into a known region family. */
export function regionBucket(region: string | null | undefined): RegionBucket {
  const r = (region ?? "").toLowerCase();
  if (r.includes("douro") || r.includes("porto")) return "douro";
  if (r.includes("comporta") || r.includes("tróia") || r.includes("troia")) return "comporta";
  if (r.includes("alentejo") || r.includes("évora") || r.includes("evora")) return "alentejo";
  if (r.includes("centro") || r.includes("coimbra") || r.includes("óbidos") || r.includes("obidos")) return "centro";
  return "lisbon-arrabida";
}

export const ADD_ONS_BY_REGION: Record<RegionBucket, SignatureAddOn[]> = {
  "lisbon-arrabida": [
    {
      id: "sommelier-tasting",
      label: "Sommelier wine flight",
      blurb: "A private flight of Setúbal estate wines with a resident sommelier.",
      pricePctOfBase: 0.18,
    },
    {
      id: "sunset-extension",
      label: "Sunset at Cabo Espichel",
      blurb: "Stay until last light at the cliff sanctuary — driver waits with you.",
      pricePctOfBase: 0.12,
      minHours: 6,
    },
    {
      id: "private-transfer",
      label: "Door-to-door private transfer",
      blurb: "Premium sedan pick-up from your hotel and return — no shared rides.",
      pricePctOfBase: 0.22,
    },
  ],
  alentejo: [
    {
      id: "estate-lunch",
      label: "Estate-table long lunch",
      blurb: "Slow lunch at a working herdade — your chef cooks at your table.",
      pricePctOfBase: 0.24,
      minHours: 6,
    },
    {
      id: "amphora-tasting",
      label: "Talha amphora tasting",
      blurb: "Taste 2000-year-old clay-vessel wines with the winemaker.",
      pricePctOfBase: 0.16,
    },
    {
      id: "private-transfer",
      label: "Door-to-door private transfer",
      blurb: "Premium sedan pick-up from your hotel and return — no shared rides.",
      pricePctOfBase: 0.25,
    },
  ],
  douro: [
    {
      id: "vintage-tasting",
      label: "Reserve vintage flight",
      blurb: "A vertical tasting of estate vintages, paired by the cellar master.",
      pricePctOfBase: 0.28,
    },
    {
      id: "river-cruise",
      label: "Private river hour",
      blurb: "A private rabelo hour on the Douro — sunset slot when available.",
      pricePctOfBase: 0.20,
      minHours: 6,
    },
    {
      id: "private-transfer",
      label: "Door-to-door private transfer",
      blurb: "Premium sedan pick-up from your hotel and return — no shared rides.",
      pricePctOfBase: 0.30,
    },
  ],
  centro: [
    {
      id: "monastery-after-hours",
      label: "After-hours monastery visit",
      blurb: "Step inside Alcobaça or Batalha after the doors close to the public.",
      pricePctOfBase: 0.22,
    },
    {
      id: "village-lunch",
      label: "Hidden-village long lunch",
      blurb: "Lunch in a stone-walled village kitchen — only the locals know it.",
      pricePctOfBase: 0.18,
      minStops: 3,
    },
    {
      id: "private-transfer",
      label: "Door-to-door private transfer",
      blurb: "Premium sedan pick-up from your hotel and return — no shared rides.",
      pricePctOfBase: 0.25,
    },
  ],
  comporta: [
    {
      id: "beach-table",
      label: "Beach-table seafood lunch",
      blurb: "A dune-side table with the day's catch — your chef plates feet-on-sand.",
      pricePctOfBase: 0.22,
      minHours: 5,
    },
    {
      id: "rice-fields-ride",
      label: "Rice-fields golden hour",
      blurb: "An open-top loop through Comporta's rice paddies at last light.",
      pricePctOfBase: 0.14,
    },
    {
      id: "private-transfer",
      label: "Door-to-door private transfer",
      blurb: "Premium sedan pick-up from your hotel and return — no shared rides.",
      pricePctOfBase: 0.22,
    },
  ],
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
 * Filters by stops/hours thresholds, never returns more than 3.
 */
export function selectSignatureAddOns(opts: {
  region: string | null | undefined;
  stopCount: number;
  durationLabel: string | null | undefined;
}): SignatureAddOn[] {
  const bucket = regionBucket(opts.region);
  const hours = parseDurationLowerHours(opts.durationLabel);
  const pool = ADD_ONS_BY_REGION[bucket] ?? [];
  return pool
    .filter((a) => (a.minStops ? opts.stopCount >= a.minStops : true))
    .filter((a) => (a.minHours ? hours >= a.minHours : true))
    .slice(0, 3);
}
