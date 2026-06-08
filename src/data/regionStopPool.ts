/**
 * Studio V3 — Phase 5A: Route Intelligence Pool foundation.
 *
 * This file defines the data model for optional, region-scoped stops that
 * Studio V3 may later use to personalize journeys beyond the hidden Signature
 * skeleton.
 *
 * IMPORTANT — current state:
 * - This pool is NOT wired into live route resolution.
 * - The feature flag below is OFF.
 * - No optional stops are seeded yet (no invention of stops is allowed).
 * - Route output, ComposerMap, MapAwakens, StoryboardHandoff, lead capture,
 *   checkout, pricing, Supabase and homepage are all unchanged by this file.
 *
 * Seeding rules (for future phases):
 * - Only add stops that already exist in confirmed Signature data or are
 *   operator-confirmed. Never invent stops.
 * - Never cross regions in a single journey.
 * - Keep `active: false` for any stop that has not been explicitly cleared.
 */

export type RegionId =
  | "lisbon-sintra-cascais"
  | "arrabida-setubal"
  | "alentejo-evora"
  | "douro-porto"
  | "comporta-troia"
  | "fatima-nazare-obidos"
  | "tomar-coimbra"
  | "other";

export type OptionalStopType =
  | "viewpoint"
  | "winery"
  | "village"
  | "beach"
  | "market"
  | "monument"
  | "table"
  | "garden"
  | "studio"
  | "boat"
  | "workshop"
  | "nature"
  | "heritage";

export type OptionalStopSource =
  | "signature-core"
  | "research-link"
  | "operator-confirmed";

export interface OptionalStop {
  id: string;
  region: RegionId;
  subregion?: string;
  name: string;
  type: OptionalStopType;
  coords?: { lat: number; lng: number };
  suitsInterests: string[];
  suitsRhythm: string[];
  suitsCompanions?: string[];
  suitsInvestment?: string[];
  durationMin: number;
  notes?: string;
  source: OptionalStopSource;
  signatureTourId?: string;
  active: boolean;
}

/**
 * Feature flag — keep OFF until a later phase explicitly activates the
 * optional stop pool inside Studio V3 curation.
 */
export const STUDIO_V3_OPTIONAL_STOPS_ENABLED = false;

/**
 * Regional optional stop pool.
 *
 * Seeded only from confirmed Signature data or operator-confirmed sources.
 * Never invent stops. Stays region-contained.
 *
 * Feature flag above is OFF — this pool has zero effect on live route output.
 */

// TODO: model route connectors separately: Baía de Setúbal ferry crossing.

export const REGION_STOP_POOL: OptionalStop[] = [
  {
    id: "roman-ruins-troia",
    region: "comporta-troia",
    subregion: "Tróia",
    name: "Roman Ruins of Tróia",
    type: "monument",
    suitsInterests: ["heritage", "local-life"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: true,
    notes: "Source-verified itinerary stop from P18.",
  },
  {
    id: "marina-de-troia",
    region: "comporta-troia",
    subregion: "Tróia",
    name: "Marina de Troia",
    type: "viewpoint",
    suitsInterests: ["coast", "local-life", "photography"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 20,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: true,
    notes: "Source-verified itinerary stop from P18.",
  },
  {
    id: "cais-palafitico-carrasqueira",
    region: "comporta-troia",
    subregion: "Carrasqueira",
    name: "Cais Palafítico do Porto da Carrasqueira",
    type: "heritage",
    suitsInterests: ["heritage", "coast", "photography", "local-life"],
    suitsRhythm: ["slow", "balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: true,
    notes: "Source-verified itinerary stop from P18.",
  },
  {
    id: "comporta-village",
    region: "comporta-troia",
    subregion: "Comporta",
    name: "Comporta",
    type: "village",
    suitsInterests: ["local-life", "gastronomy", "coast"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: true,
    notes: "Source-verified itinerary stop from P18.",
  },
  {
    id: "herdade-da-comporta",
    region: "comporta-troia",
    subregion: "Comporta",
    name: "Herdade da Comporta",
    type: "winery",
    suitsInterests: ["wine", "gastronomy", "local-life"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "friends", "corporate"],
    suitsInvestment: ["elevated", "bespoke"],
    durationMin: 75,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: true,
    notes: "Source-verified itinerary stop from P18. Winery/tasting suitability depends on supplier availability.",
  },
  {
    id: "comporta-beach",
    region: "comporta-troia",
    subregion: "Comporta",
    name: "Comporta Beach",
    type: "beach",
    suitsInterests: ["coast", "nature", "photography", "wellness"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: false,
    notes: "Source-verified itinerary stop from P18. Conditional: page notes if conditions allow.",
  },
  {
    id: "praia-do-carvalhal",
    region: "comporta-troia",
    subregion: "Carvalhal",
    name: "Praia do Carvalhal",
    type: "beach",
    suitsInterests: ["coast", "nature", "photography", "wellness"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "troia-comporta",
    active: true,
    notes: "Source-verified itinerary stop from P18.",
  },
];
