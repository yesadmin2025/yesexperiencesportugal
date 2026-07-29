/**
 * Signature Tours — Source of Truth (SoT).
 *
 * CANONICAL AUTHORITY: "YES Canonical Signature Implementation Bible v1.1
 * FINAL" (PDF) + the owner's binding clarifications of 2026-07-27. The
 * audit workbook, legacy editorial copy and current Viator wording are
 * supporting evidence only — where they disagree with the Bible, the
 * Bible wins.
 *
 * This file is the ONLY place Signature title / duration / description /
 * highlights / inclusions / exclusions / itinerary may live. Nothing here
 * may be invented. See `docs/signature-source-of-truth.md`.
 *
 * Ranges (e.g. "8 to 9 hours"): MIDPOINT for `durationMinutes`, rounded to
 * the nearest 5 minutes. Project-wide convention (approved 2026-07).
 */

/**
 * How a published stop participates in the canonical product.
 *
 *  - `origin`            — the pickup / departure entry.
 *  - `core`              — always part of the day.
 *  - `pass-by`           — seen from the road, no stop time published.
 *  - `optional`          — offered, not guaranteed.
 *  - `alternative-pool`  — one of N candidates; only `poolPick` are run.
 *  - `beach-option`      — conditional beach selection (weather / sea).
 *  - `conditional`       — included only under a named package/option.
 *
 * PDF 5.2: never infer an inclusion from itinerary presence.
 */
export type SotStopType =
  | "origin"
  | "core"
  | "pass-by"
  | "optional"
  | "alternative-pool"
  | "beach-option"
  | "conditional";

export type SotItineraryChapter = {
  /** Position in the day (1-based). */
  order: number;
  /** Real stop / activity name — spelled as published. */
  label: string;
  /** One faithful factual sentence. ≤ 220 chars. */
  description: string;
  /**
   * Real minutes spent AT this stop. `null` when no duration is published
   * (pass-bys) — never guess.
   */
  durationMinutes: number | null;
  /** Real minutes of driving/transit to the next stop, when published. */
  travelToNextMinutes: number | null;
  /**
   * Legacy flag kept for existing renderers: `true` whenever the stop is
   * not a guaranteed default. Always equals `!isDefault`.
   */
  optional: boolean;

  /** Canonical classification (Bible Part 3). */
  stopType: SotStopType;
  /** `true` when the stop runs on every departure by default. */
  isDefault: boolean;
  /** Groups mutually-exclusive candidates, e.g. `"wineries"`, `"palaces"`. */
  poolId?: string;
  /** `false` when the stop happens but its ticket is NOT included. */
  admissionIncluded?: boolean;
  /** `true` when the guest pays on the spot (meals labelled own expense). */
  ownExpense?: boolean;
};

export type SignatureSourceOfTruth = {
  /** Internal Signature tour id (must exist in signatureTours.ts). */
  tourId: string;
  /** Full Viator product URL — canonical source. */
  viatorUrl: string;
  /** e.g. "P3", parsed from the URL. */
  productCode: string;

  /** Canonical title (Bible Part 3). */
  title: string;
  /** Canonical published duration, e.g. "8–9h". */
  durationText: string;
  /** Midpoint of durationText in minutes. E.g. "8–9h" → 510. */
  durationMinutes: number;

  /** Meeting / pickup window when published (else `null`). */
  pickupWindow: string | null;
  /** Canonical pickup coverage. */
  pickupZone: string;

  /** "Private tour" | "Small group" — verbatim. */
  groupType: string;
  /** Max group size when explicitly published. */
  maxGroup: number | null;

  /** Canonical description (Bible Part 3). */
  overview: string;

  /** Verified highlights (Bible Part 3). */
  highlights: string[];
  /** Commercial truth: guaranteed inclusions. */
  included: string[];
  /** Exclusions and conditional elements. */
  notIncluded: string[];
  /** Items that vary by selected package/option. */
  variesByOption: string[];

  /** Ordered canonical chapter list. */
  itinerary: SotItineraryChapter[];

  /** How many members of each alternative pool actually run. */
  poolPick?: Record<string, { min: number; max: number; label: string }>;

  /** Cancellation policy sentence when published. */
  cancellation: string | null;
  /** Language(s) the tour is offered in. */
  languages: string[];
  /** Meeting point description when published. */
  meetingPoint: string | null;

  /** ISO date the entry was last verified. */
  verifiedAt: string;
};

const VERIFIED = "2026-07-27";
const CANCEL_24H = "You can cancel up to 24 hours in advance of the experience for a full refund.";

/** Terse builder so the 12 canonical blocks stay readable. */
function stop(
  order: number,
  label: string,
  description: string,
  durationMinutes: number | null,
  stopType: SotStopType,
  isDefault: boolean,
  extra: Partial<SotItineraryChapter> = {},
): SotItineraryChapter {
  return {
    order,
    label,
    description,
    durationMinutes,
    travelToNextMinutes: null,
    optional: !isDefault,
    stopType,
    isDefault,
    ...extra,
  };
}

/**
 * Registry — all 12 Signatures, canonical per the Bible.
 */
export const SIGNATURE_SOURCE_OF_TRUTH: Partial<Record<string, SignatureSourceOfTruth>> = {
  /* ── 1 · Tróia & Comporta — P18 ─────────────────────────── */
  "troia-comporta": {
    tourId: "troia-comporta",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Private-Troia-and-Comporta-Tour-from-Lisbon-Ruins-Wine-and-Coast/d538-349639P18",
    productCode: "P18",
    title: "Private Tróia & Comporta Tour from Lisbon – Ruins, Wine & Beaches",
    durationText: "8–9h",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone:
      "Accommodation pickup and drop-off in Lisbon, Setúbal, Sesimbra or Almada, including hotels, apartments, Airbnbs, the cruise terminal and the airport.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Cross the Sado by ferry, visit the Roman fish-salting ruins of Tróia, explore Comporta and its Atlantic beaches, and taste wine at Herdade da Comporta. Lunch is not included.",
    highlights: [
      "Sado ferry crossing with vehicle and passengers included",
      "Guided Roman Ruins of Tróia visit with admission",
      "Herdade da Comporta wine experience and tasting",
      "Comporta village, Carrasqueira stilt pier and Atlantic beaches",
      "Private local guide and flexible coastal stops",
    ],
    included: [
      "Private air-conditioned transport",
      "Private local expert guide",
      "Sado ferry for vehicle and passengers",
      "Roman Ruins of Tróia admission",
      "Herdade da Comporta wine experience and tasting",
      "Bottled water",
      "Flexible scenic and hidden-gem stops",
      "Pickup and drop-off in listed service areas",
      "Restaurant and local-experience recommendations",
    ],
    notIncluded: ["Lunch — own expense"],
    variesByOption: [],
    itinerary: [
      stop(1, "Lisbon", "Brief starting point entry.", 5, "origin", true),
      stop(
        2,
        "Baía de Setúbal / Sado ferry",
        "Vehicle and passenger ferry across the Sado.",
        15,
        "core",
        true,
      ),
      stop(
        3,
        "Roman Ruins of Tróia",
        "Guided archaeological visit; admission included.",
        45,
        "core",
        true,
      ),
      stop(4, "Marina de Tróia", "Short marina stop.", 15, "core", true),
      stop(5, "Cais Palafítico da Carrasqueira", "Stilt fishing pier.", 20, "core", true),
      stop(6, "Comporta", "Village and lunch time — lunch is own expense.", 95, "core", true, {
        ownExpense: true,
      }),
      stop(7, "Herdade da Comporta", "Wine experience and tasting.", 95, "core", true),
      stop(8, "Praia do Carvalhal", "Coastal stop.", 15, "core", true),
      stop(9, "Comporta Beach", "Coastal stop.", 15, "core", true),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 2 · Roman Talha Wine — P17 ─────────────────────────── */
  "roman-heritage-alentejo": {
    tourId: "roman-heritage-alentejo",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
    productCode: "P17",
    title: "Roman Talha Wine Tour: A Private Taste of Alentejo Family Secrets",
    durationText: "8–9h",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Private pickup and drop-off.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "A private Alentejo day linking São Cucufate's Roman villa, Vila Alva, a family talha winery with a traditional lunch, Albergaria dos Fusos and the Talha Wine Interpretation Center.",
    highlights: [
      "São Cucufate Roman archaeological site",
      "Family-run winery using Roman-style clay vessels",
      "Multiple talha wines and traditional winery lunch",
      "Talha Wine Interpretation Center",
      "Private local host, transport and bottled water",
    ],
    included: [
      "Air-conditioned private transport",
      "Private pickup and drop-off",
      "São Cucufate visit",
      "Talha Wine Interpretation Center visit",
      "Local guided family-winery experience",
      "Multiple Roman-style wines",
      "Traditional Alentejo lunch at the winery",
      "Bottled water",
      "Local guide or host throughout",
    ],
    notIncluded: ["Personal expenses"],
    variesByOption: [],
    itinerary: [
      stop(1, "Lisbon", "Starting point entry.", 10, "origin", true),
      stop(2, "Villa Romana de São Cucufate", "Roman archaeological site.", 60, "core", true),
      stop(3, "Vila Alva", "Village stop.", 30, "core", true),
      stop(
        4,
        "Adega Mestre Daniel / XXVI Talhas",
        "Family talha winery, tasting and the included traditional lunch.",
        180,
        "core",
        true,
      ),
      stop(5, "Albergaria dos Fusos", "Published as a full itinerary stop.", 60, "core", true),
      stop(6, "Talha Wine Interpretation Center", "Interpretive centre.", 60, "core", true),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 3 · Southwest Vicentine Coast — P16 ────────────────── */
  "southwest-vicentine-coast": {
    tourId: "southwest-vicentine-coast",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Exclusive-Southwest-Coast-Experience-Undiscovered-Hidden-Secret/d538-349639P16",
    productCode: "P16",
    title: "Private Lisbon to Southwest Vicentine Coast Tour: Secret Paradise",
    durationText: "9–10h",
    durationMinutes: 570,
    pickupWindow: null,
    pickupZone: "Private pickup and drop-off.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Travel privately from Lisbon along Portugal's Southwest Coast, stopping at Ilha do Pessegueiro, Porto Covo, Vila Nova de Milfontes, the natural park, Odeceixe and Aljezur. Meals are not included.",
    highlights: [
      "Ilha do Pessegueiro coastal viewpoint",
      "Porto Covo and Vila Nova de Milfontes",
      "Southwest Alentejo and Vicentine Coast Natural Park",
      "Odeceixe river-meets-ocean landscape",
      "Aljezur and its Moorish-rooted historic setting",
    ],
    included: [
      "Air-conditioned private transportation with local guide",
      "Private pickup and drop-off",
      "Entrance and transportation fees",
      "Bottled water",
      "Private personalized itinerary",
    ],
    notIncluded: ["Meals — own expense"],
    variesByOption: [],
    itinerary: [
      stop(1, "Lisbon", "Departure.", null, "pass-by", true),
      stop(2, "Ilha do Pessegueiro", "Coastal viewpoint.", 25, "core", true),
      stop(3, "Porto Covo", "Village.", 45, "core", true),
      stop(
        4,
        "Vila Nova de Milfontes",
        "Town and meal opportunity — meals are own expense.",
        90,
        "core",
        true,
        { ownExpense: true },
      ),
      stop(
        5,
        "Southwest Alentejo & Vicentine Coast Natural Park",
        "Protected coastal route.",
        60,
        "core",
        true,
      ),
      stop(6, "Odeceixe", "Where the river meets the ocean.", 90, "core", true),
      stop(7, "Aljezur", "Historic town.", 60, "core", true),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 4 · Arrábida & Sesimbra Boat — P12 ─────────────────── */
  "arrabida-boat": {
    tourId: "arrabida-boat",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
    productCode: "P12",
    title: "Private Tour from Lisbon – Arrábida, Sesimbra & Coastal Boat Ride",
    durationText: "6–8h",
    durationMinutes: 420,
    pickupWindow: null,
    pickupZone:
      "Pickup and drop-off in Lisbon, Setúbal, Sesimbra or Almada, including hotels, apartments, Airbnbs, the cruise terminal and the airport.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "A private Arrábida and Sesimbra day combining Livramento Market, the natural park, Lapa de Santa Margarida, Sesimbra and the Sesimbra Coastal Boat Tour. Lunch is not included.",
    highlights: [
      "Livramento Market and Arrábida Natural Park",
      "Sesimbra Coastal Boat Tour",
      "Lapa de Santa Margarida",
      "Sesimbra fishing town and castle",
      "Cabo Espichel clifftop sanctuary",
    ],
    included: [
      "Private transportation",
      "Sesimbra Coastal Boat Tour",
      "Private local guide",
      "Pickup and drop-off in Lisbon, Setúbal, Sesimbra or Almada",
      "Bottled water",
      "Air-conditioned vehicle",
    ],
    notIncluded: ["Lunch — own expense", "Personal expenses"],
    variesByOption: [],
    itinerary: [
      stop(1, "Lisbon", "Starting point entry.", 10, "origin", true),
      stop(2, "Mercado do Livramento", "Market stop.", 45, "core", true),
      stop(3, "Parque Natural da Arrábida", "Scenic park route.", 60, "core", true),
      stop(4, "Lapa de Santa Margarida", "Sea cave and chapel.", 30, "core", true),
      stop(5, "Castelo de Sesimbra", "Castle stop.", 30, "core", true),
      stop(6, "Cabo Espichel", "Sanctuary and cliffs.", 30, "core", true),
      stop(
        7,
        "Sesimbra — Coastal Boat Tour and free time",
        "The Sesimbra Coastal Boat Tour plus time in town; lunch is own expense.",
        240,
        "core",
        true,
        { ownExpense: true },
      ),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 5 · Sintra & Cascais — P10 ─────────────────────────── */
  "sintra-cascais": {
    tourId: "sintra-cascais",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Sintra-and-Cascais-Hidden-Gems-Private-Tour-with-Wine-Tasting/d538-349639P10",
    productCode: "P10",
    title: "Private Sintra & Cascais Tour from Lisbon – Hidden Gems & Wine",
    durationText: "8–10h",
    durationMinutes: 540,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off in Lisbon, Setúbal, Almada or Sesimbra.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "A private, flexible Sintra and Cascais tour with coastal viewpoints, planned to reduce queues. The included ticket package is either one palace plus the Colares wine visit, or two palace tickets per person.",
    highlights: [
      "Private full-day history, wine and coastal route",
      "Flexible palace selection with expert guide",
      "One palace plus wine tasting, or two palace tickets",
      "Azenhas do Mar, Cabo da Roca and Cascais",
      "Private transport and local pastry",
    ],
    included: [
      "Private transportation",
      "Air-conditioned vehicle",
      "Bottled water",
      "Certified guide",
      "Pickup and drop-off in Lisbon, Setúbal, Almada or Sesimbra",
      "Local pastry",
    ],
    notIncluded: ["Lunch — own expense"],
    variesByOption: [
      "Ticket package: either one palace ticket plus the wine tour and tasting, or two palace tickets per person",
    ],
    itinerary: [
      stop(1, "Sintra", "Historic town.", 60, "core", true),
      stop(
        2,
        "Sintra National Palace",
        "Palace candidate — included when selected.",
        90,
        "alternative-pool",
        false,
        { poolId: "palaces" },
      ),
      stop(
        3,
        "Pena Palace",
        "Palace candidate — included when selected.",
        90,
        "alternative-pool",
        false,
        { poolId: "palaces" },
      ),
      stop(
        4,
        "Azenhas do Mar",
        "Clifftop coastal stop and meal opportunity — lunch is own expense.",
        90,
        "core",
        true,
        { ownExpense: true },
      ),
      stop(
        5,
        "Quinta da Regaleira",
        "Palace/monument candidate — included when selected.",
        90,
        "alternative-pool",
        false,
        { poolId: "palaces" },
      ),
      stop(
        6,
        "Adega Regional de Colares",
        "Included with the one-palace-plus-wine package.",
        90,
        "conditional",
        true,
      ),
      stop(7, "Cascais", "Seaside town.", 45, "core", true),
      stop(8, "Cabo da Roca", "Coastal viewpoint.", 30, "core", true),
    ],
    poolPick: {
      palaces: { min: 1, max: 2, label: "Palace tickets — one plus wine, or two palaces" },
    },
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 6 · Azeitão Cheese & Wine — P9 ─────────────────────── */
  "azeitao-cheese": {
    tourId: "azeitao-cheese",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Azeitao-Cheese-Private-Workshop-with-Wine-and-Food-Tasting/d538-349639P9",
    productCode: "P9",
    title: "Private Azeitão Cheese Workshop: Wine & Sesimbra Coastal Tour",
    durationText: "8h30",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Pickup and drop-off in the listed service areas.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Visit Livramento Market, join a private Azeitão cheese workshop with regional tastings, explore Azeitão, taste wine at a local winery and continue to Sesimbra. Lunch is not included.",
    highlights: [
      "Private Azeitão cheese workshop",
      "Regional bread, cheeses, jam or chutney and Moscatel",
      "Local winery entrance and tasting",
      "Livramento Market, Azeitão and Sesimbra",
      "Private transfers and air-conditioned transport",
    ],
    included: [
      "Air-conditioned private transport and fees",
      "Private Azeitão cheese workshop",
      "Toasts and regional bread",
      "Fresh cheese and Azeitão cheese",
      "Homemade jam or chutney",
      "Moscatel wine",
      "Bottled water",
      "Pickup and drop-off in listed service areas",
      "Winery entrance and tasting",
    ],
    notIncluded: [
      "Lunch — own expense",
      "Tróia or Comporta pickup — additional pickup supplement, or guest ferry transfer to Setúbal",
    ],
    variesByOption: [],
    itinerary: [
      stop(1, "Mercado do Livramento", "Market and products.", 90, "core", true),
      stop(
        2,
        "Quinta Velha — cheese workshop",
        "Private Azeitão cheese workshop.",
        90,
        "core",
        true,
      ),
      stop(3, "Azeitão", "Village time and lunch — lunch is own expense.", 90, "core", true, {
        ownExpense: true,
      }),
      stop(4, "Farm Catralvos", "Winery entrance and tasting.", 120, "core", true),
      stop(5, "Castelo de Sesimbra", "Sesimbra and castle block.", 120, "core", true),
      stop(6, "Cristo Rei", "Panoramic route.", null, "pass-by", true),
      stop(7, "25 de Abril Bridge", "Return route.", null, "pass-by", true),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 7 · Tomar & Coimbra — P8 ───────────────────────────── */
  "tomar-coimbra": {
    tourId: "tomar-coimbra",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/From-Lisbon-Private-Full-Day-Tour-to-Tomar-and-Coimbra/d538-349639P8",
    productCode: "P8",
    title: "Private Tomar & Coimbra Tour from Lisbon – Templars & Scholars",
    durationText: "8–9h",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Private pickup and drop-off.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Travel privately from Lisbon to Tomar's Convento de Cristo and historic centre, then continue to Coimbra, its university and the Joanina Library. Lunch is not included.",
    highlights: [
      "Convento de Cristo and Templar heritage",
      "Tomar historic centre",
      "University of Coimbra",
      "Joanina Library timed entry",
      "Private guide, tickets, transport, water and local pastry",
    ],
    included: [
      "All fees and taxes",
      "Private transportation",
      "Air-conditioned vehicle",
      "All entrances and tickets",
      "Certified tour guide",
      "Bottled water",
      "Local pastry",
    ],
    notIncluded: ["Lunch — own expense"],
    variesByOption: [],
    itinerary: [
      stop(1, "Lisbon", "Starting point entry.", 10, "origin", true),
      stop(2, "Convento de Cristo", "Templar UNESCO monument.", 90, "core", true),
      stop(3, "Coimbra", "Historic city time.", 120, "core", true, { ownExpense: true }),
      stop(4, "University of Coimbra", "University complex.", 90, "core", true),
      stop(5, "Biblioteca Joanina", "Timed library entry.", 90, "core", true),
      stop(6, "Tomar", "Historic town time.", 120, "core", true),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 8 · Évora & Alentejo Wine — P6 ─────────────────────── */
  "evora-alentejo": {
    tourId: "evora-alentejo",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Private-Full-Day-Wine-Tour-in-Setubal-Region-from-Lisbon/d538-349639P6",
    productCode: "P6",
    title: "Private Évora & Alentejo Wine Tour from Lisbon – Cork & Flavors",
    durationText: "9–11h",
    durationMinutes: 600,
    pickupWindow: null,
    pickupZone: "Private accommodation pickup and drop-off.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Explore Évora's historic centre, Roman Temple and Chapel of Bones, visit two selected Alentejo wineries for tastings, and see a traditional cork production site. Lunch is not included.",
    highlights: [
      "Évora UNESCO historic centre",
      "Roman Temple and Chapel of Bones",
      "Two selected Alentejo winery visits and tastings",
      "Local cheeses and cured meats",
      "Traditional cork production site",
    ],
    included: [
      "Private accommodation pickup and drop-off",
      "Dedicated local guide or host",
      "Évora and Chapel of Bones entrance fees",
      "Two selected winery visits and tastings",
      "Local cheese and cured-meat tastings",
      "Traditional cork production site visit",
      "Bottled water",
      "Traditional restaurant reservation or recommendation",
    ],
    notIncluded: ["Lunch — own expense"],
    variesByOption: ["Which two wineries run is confirmed with you based on availability"],
    itinerary: [
      stop(1, "25 de Abril Bridge", "Outbound route.", null, "pass-by", true),
      stop(
        2,
        "João Portugal Ramos",
        "Winery candidate — two wineries run in total.",
        90,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        3,
        "Cartuxa",
        "Winery candidate — two wineries run in total.",
        90,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        4,
        "Pêra-Grave",
        "Winery candidate — two wineries run in total.",
        90,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        5,
        "Ervideira",
        "Winery candidate — two wineries run in total.",
        90,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        6,
        "Herdade do Esporão",
        "Winery candidate — two wineries run in total.",
        120,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(7, "Chapel of Bones", "Évora — entrance included.", 30, "core", true),
      stop(8, "Évora historic centre", "Walking time.", 60, "core", true, { ownExpense: true }),
      stop(9, "Roman Temple of Évora", "Historic monument.", 10, "core", true),
      stop(10, "Corticarte", "Cork production visit.", 30, "core", true),
    ],
    poolPick: {
      wineries: { min: 2, max: 2, label: "Two selected Alentejo wineries" },
    },
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 9 · Fátima, Nazaré & Óbidos — P5 ───────────────────── */
  "fatima-nazare-obidos": {
    tourId: "fatima-nazare-obidos",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Private-Full-day-Fatima-Nazare-Obidos-Tour-from-Lisbon/d538-349639P5",
    productCode: "P5",
    title: "Private Lisbon to Fátima, Nazaré & Óbidos Tour – Spirit & Charm",
    durationText: "8–9h",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Private pickup and drop-off.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Visit the Sanctuary of Fátima, Nazaré's beach and cliff setting — where the Atlantic's giant waves arrive seasonally in winter — and the walled town of Óbidos, finishing with Ginjinha and a local pastry. Lunch is not included.",
    highlights: [
      "Sanctuary of Fátima",
      "Nazaré viewpoint, beach and fishing town",
      "Óbidos medieval walled town and castle",
      "Ginjinha tasting and local pastry",
      "Private certified guide and transport",
    ],
    included: [
      "All fees and taxes",
      "Air-conditioned private transportation",
      "Ginjinha tasting",
      "Certified guide",
      "Private pickup and drop-off",
      "Bottled water",
      "Local pastry",
    ],
    notIncluded: ["Lunch — own expense"],
    variesByOption: [],
    itinerary: [
      stop(1, "Lisbon", "Starting point entry.", 10, "origin", true),
      stop(2, "Fátima", "The Sanctuary of Fátima.", 120, "core", true),
      stop(
        3,
        "Nazaré",
        "Town time and meal opportunity — lunch is own expense.",
        120,
        "core",
        true,
        { ownExpense: true },
      ),
      stop(4, "Óbidos", "Walled town.", 90, "core", true),
      stop(
        5,
        "Praia da Nazaré",
        "Beach stop; the giant waves are a seasonal winter phenomenon.",
        30,
        "core",
        true,
      ),
      stop(6, "Castelo de Óbidos", "Castle area.", 60, "core", true),
    ],
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 10 · Azulejo, Wine & Sesimbra — P4 ─────────────────── */
  "tiles-workshop": {
    tourId: "tiles-workshop",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Full-Day-Golf-and-Wine-tasting-Private-Tour-in-South-Lisbon/d538-349639P4",
    productCode: "P4",
    title: "Tile Painting, Wine & Coastal Sesimbra Private Tour from Lisbon",
    durationText: "8–9h",
    durationMinutes: 510,
    pickupWindow: null,
    pickupZone: "Private pickup and drop-off.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Paint a Portuguese azulejo in Azeitão, visit the region and Sesimbra, and enjoy a selected winery tasting. Tile shipping, entrances, cheese tasting and private transport are included; lunch is not.",
    highlights: [
      "Hands-on azulejo painting workshop",
      "Tile firing and shipping",
      "Selected regional winery tasting",
      "Livramento Market and Sesimbra",
      "Private guide, transport, entrances and cheese tasting",
    ],
    included: [
      "Private transportation",
      "Bottled water",
      "Certified guide",
      "Air-conditioned vehicle",
      "Wine tasting",
      "Tile-making workshop",
      "Tile shipping",
      "All listed entrances",
      "Cheese tasting",
    ],
    notIncluded: ["Lunch — own expense", "Cristo Rei admission"],
    variesByOption: [
      "One winery is selected from the regional pool and confirmed with the supplier",
    ],
    itinerary: [
      stop(1, "Lisbon", "Departure.", null, "pass-by", true),
      stop(2, "Mercado do Livramento", "Market stop.", 15, "core", true),
      stop(3, "Castelo de Sesimbra", "Castle.", 20, "core", true),
      stop(4, "Azulejos de Azeitão", "Tile workshop.", 120, "core", true),
      stop(5, "Sesimbra", "Town time and lunch — lunch is own expense.", 90, "core", true, {
        ownExpense: true,
      }),
      stop(
        6,
        "José Maria da Fonseca",
        "Winery candidate — one winery runs.",
        90,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        7,
        "Farm Catralvos",
        "Winery candidate — one winery runs.",
        90,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(8, "Bacalhôa", "Winery candidate — one winery runs.", 90, "alternative-pool", false, {
        poolId: "wineries",
      }),
      stop(
        9,
        "Cristo Rei",
        "Optional viewpoint — admission is not included.",
        20,
        "optional",
        false,
        { admissionIncluded: false },
      ),
    ],
    poolPick: {
      wineries: { min: 1, max: 1, label: "One selected regional winery" },
    },
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 11 · Setúbal & Arrábida Wine — P3 ──────────────────── */
  "arrabida-wine-allinclusive": {
    tourId: "arrabida-wine-allinclusive",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
    productCode: "P3",
    title: "Private Setúbal & Arrábida Wine Tour – Wineries, Lunch & Views",
    durationText: "7–9h",
    durationMinutes: 480,
    pickupWindow: null,
    pickupZone:
      "Private pickup and drop-off; small-group meeting point at Hard Rock Cafe. Tróia/Comporta pickup is an additional supplement or a guest ferry transfer to Setúbal.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "Explore Setúbal, Palmela, Azeitão and Arrábida with two selected wineries, regional snacks and lunch included. In Tailor you can add a third and a fourth winery, or remove lunch.",
    highlights: [
      "Two selected wineries included, up to four in Tailor",
      "Wine tastings and regional snacks",
      "Livramento Market and the Azeitão tile factory",
      "Arrábida Natural Park",
      "Optional Cristo Rei or Sesimbra Castle stop",
    ],
    included: [
      "Two selected wineries based on availability",
      "Wine tastings",
      "Regional snacks",
      "Lunch",
      "Private transportation",
      "Bottled water",
      "Hotel pickup and drop-off",
      "Local certified guide",
      "Livramento Market",
      "Azeitão tile factory",
      "Arrábida Natural Park",
    ],
    notIncluded: [
      "Cristo Rei or Sesimbra Castle — optional route stop",
      "Tróia or Comporta pickup — additional supplement, or guest ferry transfer to Setúbal",
    ],
    variesByOption: ["Which wineries run is confirmed with you based on availability"],
    itinerary: [
      stop(1, "Lisbon", "Starting point entry.", 5, "origin", true),
      stop(2, "Sesimbra", "The route may pass through town.", null, "pass-by", true),
      stop(3, "Parque Natural da Arrábida", "Scenic route.", 30, "core", true),
      stop(
        4,
        "José Maria da Fonseca",
        "Winery candidate — two run by default, up to four in Tailor.",
        45,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(5, "Mercado do Livramento", "Market.", 30, "core", true),
      stop(6, "Azeitão", "Village and the included lunch.", 60, "core", true),
      stop(
        7,
        "Quinta do Piloto",
        "Winery candidate — two run by default, up to four in Tailor.",
        30,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        8,
        "Adega Cooperativa de Palmela",
        "Winery candidate — two run by default, up to four in Tailor.",
        30,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(
        9,
        "Bacalhôa",
        "Winery candidate — two run by default, up to four in Tailor.",
        45,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(10, "Azulejos de Azeitão", "Tile factory.", 30, "core", true),
      stop(
        11,
        "Farm Catralvos",
        "Winery candidate — two run by default, up to four in Tailor.",
        45,
        "alternative-pool",
        false,
        { poolId: "wineries" },
      ),
      stop(12, "Cristo Rei", "Optional viewpoint.", 15, "optional", false),
      stop(13, "Castelo de Sesimbra", "Optional viewpoint.", 15, "optional", false),
    ],
    poolPick: {
      wineries: { min: 2, max: 4, label: "Selected wineries — two included, up to four" },
    },
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },

  /* ── 12 · Arrábida Beaches & Picnic — P1 ────────────────── */
  "wild-beaches-picnic": {
    tourId: "wild-beaches-picnic",
    viatorUrl:
      "https://www.viator.com/tours/Lisbon/Wild-Beaches-and-Picnic-Experience/d538-349639P1",
    productCode: "P1",
    title: "Private Lisbon Coastal Tour – Arrábida, Sesimbra and Beach Picnic",
    durationText: "7h30",
    durationMinutes: 450,
    pickupWindow: null,
    pickupZone: "Private pickup and drop-off in Lisbon, Setúbal, Almada or Sesimbra.",
    groupType: "Private tour",
    maxGroup: null,
    overview:
      "A private 7.5-hour coastal route through Arrábida, Sesimbra and the Meco area, including a regional picnic and a flexible selection of beaches and viewpoints according to conditions.",
    highlights: [
      "Arrábida Natural Park and coastal viewpoints",
      "Galapinhos, Bicas and Meco-area beaches",
      "Private picnic with regional products",
      "Livramento Market, Lapa de Santa Margarida and Sesimbra",
      "Private guide and door-to-door transport",
    ],
    included: [
      "Private transportation",
      "Air-conditioned vehicle",
      "Private picnic with local cheeses, bread, smoked meats, pastries, fruit, wine, juice and water",
      "Bottled water",
      "All fees and taxes",
      "Local certified guide",
      "Private pickup and drop-off in Lisbon, Setúbal, Almada or Sesimbra",
    ],
    notIncluded: [],
    variesByOption: ["Which beaches run depends on sea and weather conditions on the day"],
    itinerary: [
      stop(1, "Lisbon", "Departure.", null, "pass-by", true),
      stop(2, "Parque Natural da Arrábida", "Scenic route.", 60, "core", true),
      stop(3, "Portinho da Arrábida", "Coastal stop.", 30, "core", true),
      stop(4, "Mercado do Livramento", "Picnic products and market.", 30, "core", true),
      stop(5, "Lapa de Santa Margarida", "Sea cave and chapel.", 30, "core", true),
      stop(6, "Sesimbra", "Fishing town.", 30, "core", true),
      stop(7, "Cabo Espichel", "Sanctuary and cliffs.", 40, "core", true),
      stop(8, "Praia das Bicas", "Beach option, chosen on the day.", 60, "beach-option", false, {
        poolId: "beaches",
      }),
      stop(9, "Praia do Meco", "Beach option, chosen on the day.", 60, "beach-option", false, {
        poolId: "beaches",
      }),
      stop(10, "Praia da Foz", "Coastal route.", null, "pass-by", true),
      stop(11, "Lagoa de Albufeira", "Lagoon route.", null, "pass-by", true),
      stop(
        12,
        "Praia de Galapinhos",
        "Beach option, chosen on the day.",
        60,
        "beach-option",
        false,
        { poolId: "beaches" },
      ),
      stop(13, "Castelo de Sesimbra", "Castle.", 30, "core", true),
      stop(14, "Cristo Rei", "Return panorama.", null, "pass-by", true),
      stop(15, "25 de Abril Bridge", "Return route.", null, "pass-by", true),
    ],
    poolPick: {
      beaches: { min: 1, max: 2, label: "Beaches selected on the day by conditions" },
    },
    cancellation: CANCEL_24H,
    languages: ["English", "Portuguese", "Spanish"],
    meetingPoint: null,
    verifiedAt: VERIFIED,
  },
};

/**
 * Canonical Viator URL registry for the 12 Signature tours.
 * Route ids are preserved for SEO continuity — two ids intentionally point
 * at Viator products whose published names differ from the internal id.
 * Unresolved product-code mismatches are reported, never silently changed.
 */
export const CANONICAL_VIATOR_URLS: Record<string, string> = {
  "arrabida-wine-allinclusive":
    "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
  "wild-beaches-picnic":
    "https://www.viator.com/tours/Lisbon/Wild-Beaches-and-Picnic-Experience/d538-349639P1",
  "arrabida-boat":
    "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
  "tiles-workshop":
    "https://www.viator.com/tours/Lisbon/Full-Day-Golf-and-Wine-tasting-Private-Tour-in-South-Lisbon/d538-349639P4",
  "azeitao-cheese":
    "https://www.viator.com/tours/Lisbon/Azeitao-Cheese-Private-Workshop-with-Wine-and-Food-Tasting/d538-349639P9",
  "sintra-cascais":
    "https://www.viator.com/tours/Lisbon/Sintra-and-Cascais-Hidden-Gems-Private-Tour-with-Wine-Tasting/d538-349639P10",
  "troia-comporta":
    "https://www.viator.com/tours/Lisbon/Private-Troia-and-Comporta-Tour-from-Lisbon-Ruins-Wine-and-Coast/d538-349639P18",
  "evora-alentejo":
    "https://www.viator.com/tours/Lisbon/Private-Full-Day-Wine-Tour-in-Setubal-Region-from-Lisbon/d538-349639P6",
  "tomar-coimbra":
    "https://www.viator.com/tours/Lisbon/From-Lisbon-Private-Full-Day-Tour-to-Tomar-and-Coimbra/d538-349639P8",
  "fatima-nazare-obidos":
    "https://www.viator.com/tours/Lisbon/Private-Full-day-Fatima-Nazare-Obidos-Tour-from-Lisbon/d538-349639P5",
  "roman-heritage-alentejo":
    "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
  "southwest-vicentine-coast":
    "https://www.viator.com/tours/Lisbon/Exclusive-Southwest-Coast-Experience-Undiscovered-Hidden-Secret/d538-349639P16",
};

/* -------------------------------------------------------------------------- */
/*  Read helpers — all fall back to `undefined` when the SoT entry is missing. */
/* -------------------------------------------------------------------------- */

export function getSot(tourId: string): SignatureSourceOfTruth | undefined {
  return SIGNATURE_SOURCE_OF_TRUTH[tourId];
}

export function sotOverview(tourId: string): string | undefined {
  return getSot(tourId)?.overview;
}

export function sotHighlights(tourId: string): string[] | undefined {
  const v = getSot(tourId)?.highlights;
  return v && v.length > 0 ? v : undefined;
}

export function sotIncluded(tourId: string): string[] | undefined {
  const v = getSot(tourId)?.included;
  return v && v.length > 0 ? v : undefined;
}

export function sotItinerary(tourId: string): SotItineraryChapter[] | undefined {
  const v = getSot(tourId)?.itinerary;
  return v && v.length > 0 ? v : undefined;
}

/** Only the stops that run on every departure (excludes pools/options). */
export function sotDefaultItinerary(tourId: string): SotItineraryChapter[] | undefined {
  const v = sotItinerary(tourId)?.filter((c) => c.isDefault);
  return v && v.length > 0 ? v : undefined;
}

export function sotDurationMinutes(tourId: string): number | undefined {
  return getSot(tourId)?.durationMinutes;
}

export function sotDurationText(tourId: string): string | undefined {
  return getSot(tourId)?.durationText;
}

/**
 * canonicalViatorUrl — single source of truth for every Viator link
 * rendered on the site.
 */
export function canonicalViatorUrl(tourId: string): string | undefined {
  return getSot(tourId)?.viatorUrl ?? CANONICAL_VIATOR_URLS[tourId];
}
