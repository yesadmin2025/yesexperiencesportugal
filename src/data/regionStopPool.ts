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
  | "sintra-cascais"
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
  {
    id: "tomar-historic-center",
    region: "tomar-coimbra",
    subregion: "Tomar",
    name: "Tomar",
    type: "heritage",
    suitsInterests: ["heritage", "local-life", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "tomar-coimbra",
    active: true,
    notes: "Source-verified itinerary stop from P8.",
  },
  {
    id: "convento-de-cristo",
    region: "tomar-coimbra",
    subregion: "Tomar",
    name: "Convento de Cristo",
    type: "monument",
    suitsInterests: ["heritage", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 75,
    source: "signature-core",
    signatureTourId: "tomar-coimbra",
    active: true,
    notes: "Source-verified itinerary stop from P8. Core heritage anchor.",
  },
  {
    id: "coimbra-historic-center",
    region: "tomar-coimbra",
    subregion: "Coimbra",
    name: "Coimbra",
    type: "heritage",
    suitsInterests: ["heritage", "local-life", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "tomar-coimbra",
    active: true,
    notes: "Source-verified itinerary stop from P8.",
  },
  {
    id: "universidade-de-coimbra",
    region: "tomar-coimbra",
    subregion: "Coimbra",
    name: "Universidade de Coimbra",
    type: "monument",
    suitsInterests: ["heritage", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "tomar-coimbra",
    active: true,
    notes: "Source-verified itinerary stop from P8. Core Coimbra heritage anchor.",
  },
  {
    id: "biblioteca-joanina",
    region: "tomar-coimbra",
    subregion: "Coimbra",
    name: "Biblioteca Joanina",
    type: "monument",
    suitsInterests: ["heritage", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "tomar-coimbra",
    active: true,
    notes: "Source-verified itinerary stop from P8. May require ticket/access confirmation depending on operating conditions.",
  },
  {
    id: "fatima-sanctuary",
    region: "fatima-nazare-obidos",
    subregion: "Fátima",
    name: "Fátima Sanctuary",
    type: "monument",
    suitsInterests: ["heritage", "local-life"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 75,
    source: "signature-core",
    signatureTourId: "fatima-nazare-obidos",
    active: true,
    notes: "Source-verified itinerary stop from P5. Includes Sanctuary of Our Lady of Fátima, Basilica of Our Lady of the Rosary and Chapel of the Apparitions.",
  },
  {
    id: "nazare-town",
    region: "fatima-nazare-obidos",
    subregion: "Nazaré",
    name: "Nazaré",
    type: "village",
    suitsInterests: ["coast", "local-life", "gastronomy", "photography"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "fatima-nazare-obidos",
    active: true,
    notes: "Source-verified itinerary stop from P5. Includes Nazaré town and Sítio da Nazaré viewpoint.",
  },
  {
    id: "praia-da-nazare",
    region: "fatima-nazare-obidos",
    subregion: "Nazaré",
    name: "Praia da Nazaré",
    type: "beach",
    suitsInterests: ["coast", "nature", "photography"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "fatima-nazare-obidos",
    active: true,
    notes: "Source-verified itinerary stop from P5.",
  },
  {
    id: "obidos-medieval-town",
    region: "fatima-nazare-obidos",
    subregion: "Óbidos",
    name: "Óbidos",
    type: "village",
    suitsInterests: ["heritage", "local-life", "photography"],
    suitsRhythm: ["slow", "balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "fatima-nazare-obidos",
    active: true,
    notes: "Source-verified itinerary stop from P5. Medieval town / streets.",
  },
  {
    id: "castelo-de-obidos",
    region: "fatima-nazare-obidos",
    subregion: "Óbidos",
    name: "Castelo de Óbidos",
    type: "monument",
    suitsInterests: ["heritage", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "fatima-nazare-obidos",
    active: true,
    notes: "Source-verified itinerary stop from P5.",
  },
  {
    id: "sintra-town",
    region: "sintra-cascais",
    subregion: "Sintra",
    name: "Sintra",
    type: "village",
    suitsInterests: ["heritage", "local-life", "photography"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary stop from P10. Historic town / village anchor.",
  },
  {
    id: "sintra-national-palace",
    region: "sintra-cascais",
    subregion: "Sintra",
    name: "Sintra National Palace",
    type: "monument",
    suitsInterests: ["heritage", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary option from P10. Treat as one-of-N Sintra monument option, not automatically combined with every palace.",
  },
  {
    id: "pena-palace",
    region: "sintra-cascais",
    subregion: "Sintra",
    name: "Park and National Palace of Pena",
    type: "monument",
    suitsInterests: ["heritage", "garden", "photography"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["elevated", "bespoke"],
    durationMin: 90,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary option from P10. Treat as one-of-N Sintra monument/garden option. Access and timing need confirmation.",
  },
  {
    id: "quinta-da-regaleira",
    region: "sintra-cascais",
    subregion: "Sintra",
    name: "Quinta da Regaleira",
    type: "garden",
    suitsInterests: ["heritage", "garden", "photography", "hidden"],
    suitsRhythm: ["balanced", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["elevated", "bespoke"],
    durationMin: 75,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary option from P10. Treat as one-of-N Sintra monument/garden option. Access and timing need confirmation.",
  },
  {
    id: "azenhas-do-mar",
    region: "sintra-cascais",
    subregion: "Sintra coast",
    name: "Azenhas do Mar",
    type: "village",
    suitsInterests: ["coast", "gastronomy", "photography", "local-life"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary stop from P10. Coastal village / lunch context.",
  },
  {
    id: "adega-regional-de-colares",
    region: "sintra-cascais",
    subregion: "Colares",
    name: "Adega Regional de Colares",
    type: "winery",
    suitsInterests: ["wine", "heritage", "local-life", "gastronomy"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "friends", "corporate"],
    suitsInvestment: ["elevated", "bespoke"],
    durationMin: 60,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary stop from P10. Winery/tasting suitability depends on supplier availability.",
  },
  {
    id: "cascais-town",
    region: "sintra-cascais",
    subregion: "Cascais",
    name: "Cascais",
    type: "village",
    suitsInterests: ["coast", "local-life", "photography", "gastronomy"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 45,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary stop from P10. Coastal town anchor.",
  },
  {
    id: "cabo-da-roca",
    region: "sintra-cascais",
    subregion: "Sintra coast",
    name: "Cabo da Roca",
    type: "viewpoint",
    suitsInterests: ["coast", "nature", "photography"],
    suitsRhythm: ["slow", "balanced"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: 30,
    source: "signature-core",
    signatureTourId: "sintra-cascais",
    active: true,
    notes: "Source-verified itinerary stop from P10. Viewpoint / western coast anchor.",
  },
];
