// Region stops catalog — the single source of truth for stops that Drift can
// compose into a personalized day. Stops belong to a REGION, not a tour;
// the composer mixes & matches them under operational rules.
//
// Seeded from the existing real Signature tours (no invented places).
// Operational fields marked `verified: false` are first-pass best-guesses —
// please correct the canonical hours / closed days / dwell times in one pass
// and flip `verified: true`. The composer treats unverified fields as soft.

export type StopKind =
  | "winery"
  | "market"
  | "viewpoint"
  | "beach"
  | "table"        // sit-down meal / long lunch
  | "village"      // harbour walk, small town stroll
  | "heritage"    // castle, convent, museum, cromlech
  | "cellar"
  | "workshop";   // cheese / tiles / hands-on

export type RegionKey =
  | "arrabida"      // Setúbal · Azeitão · Sesimbra · Arrábida
  | "lisbon-coast"  // Sintra · Cascais · Cabo da Roca
  | "alentejo"      // Évora · Troia · Comporta
  | "centro";      // Fátima · Nazaré · Óbidos · Tomar · Coimbra

export type DriftAffinity = {
  /** Drift profile style this stop pulls toward. */
  style?: Array<"coast" | "heritage" | "wine" | "table">;
  energy?: Array<"slow" | "vivid">;
  social?: Array<"intimate" | "shared">;
  companions?: Array<"solo" | "couple" | "family" | "group">;
};

export interface RegionStop {
  id: string;
  region: RegionKey;
  name: string;
  kind: StopKind;
  /** Approximate lat/lng — used for haversine drive-time estimation. */
  coords: { lat: number; lng: number };
  /** Typical on-site dwell, minutes. */
  dwellMin: number;
  /** null = open all day. */
  hours: { open: string; close: string } | null;
  /** ISO weekday closed (1=Mon … 7=Sun). */
  closedDays: number[];
  /** Optional months window (1–12 inclusive). */
  seasonalMonths?: { from: number; to: number };
  /** Editorial weight inside its kind (0–10). Used as a soft tie-breaker. */
  priority: number;
  /** Which Drift dimensions this stop reinforces. */
  affinity: DriftAffinity;
  /** Lightweight rhythm cue for ordering (morning / midday / afternoon / sunset). */
  timeOfDay: Array<"morning" | "midday" | "afternoon" | "sunset">;
  /** One-line editorial blurb shown in the composed day. */
  blurb: string;
  /** Anchor Signature tour id for the "continue with a local" CTA. */
  anchorTourId?: string;
  /** false = operational fields are best-guess; need human verification. */
  verified: boolean;
}

/** Pickup origins per region — for distance budget from start of day. */
export const REGION_ORIGIN: Record<RegionKey, { lat: number; lng: number; label: string }> = {
  arrabida:       { lat: 38.7223, lng: -9.1393, label: "Lisbon" },
  "lisbon-coast": { lat: 38.7223, lng: -9.1393, label: "Lisbon" },
  alentejo:       { lat: 38.5713, lng: -7.9135, label: "Évora" },
  centro:         { lat: 40.2056, lng: -8.4196, label: "Coimbra" },
};

// Helper to keep the catalog terse.
const s = (x: Omit<RegionStop, "verified"> & { verified?: boolean }): RegionStop => ({
  verified: false,
  ...x,
});

export const REGION_STOPS: RegionStop[] = [
  // ── Arrábida / Setúbal / Azeitão / Sesimbra ───────────────────────────
  s({
    id: "cristo-rei-viewpoint",
    region: "arrabida",
    name: "Cristo Rei viewpoint",
    kind: "viewpoint",
    coords: { lat: 38.6779, lng: -9.1733 },
    dwellMin: 25, hours: null, closedDays: [],
    priority: 6,
    affinity: { style: ["heritage"], energy: ["slow"], social: ["shared"] },
    timeOfDay: ["morning"],
    blurb: "Lisbon laid out below, the bridge gleaming over the Tagus.",
    anchorTourId: "arrabida-wine-allinclusive",
  }),
  s({
    id: "livramento-market",
    region: "arrabida",
    name: "Livramento market, Setúbal",
    kind: "market",
    coords: { lat: 38.5258, lng: -8.8929 },
    dwellMin: 30,
    hours: { open: "07:00", close: "14:00" }, // mornings only
    closedDays: [1], // closed Mondays
    priority: 8,
    affinity: { style: ["table", "heritage"], energy: ["slow"], social: ["intimate"] },
    timeOfDay: ["morning"],
    blurb: "Tile-clad market, fishmongers and pastry counters before noon.",
    anchorTourId: "arrabida-wine-allinclusive",
  }),
  s({
    id: "azeitao-winery-jmf",
    region: "arrabida",
    name: "Family winery in Azeitão",
    kind: "winery",
    coords: { lat: 38.5152, lng: -9.0144 },
    dwellMin: 75, hours: { open: "10:00", close: "18:00" }, closedDays: [7],
    priority: 9,
    affinity: { style: ["wine"], energy: ["slow"], social: ["intimate"] },
    timeOfDay: ["morning", "afternoon"],
    blurb: "Cellar walk and a guided tasting with the family who pressed the grapes.",
    anchorTourId: "arrabida-wine-allinclusive",
  }),
  s({
    id: "azeitao-winery-moscatel",
    region: "arrabida",
    name: "Moscatel cellar, Azeitão",
    kind: "winery",
    coords: { lat: 38.5102, lng: -9.0212 },
    dwellMin: 70, hours: { open: "10:00", close: "18:00" }, closedDays: [7],
    priority: 8,
    affinity: { style: ["wine"], energy: ["slow"] },
    timeOfDay: ["afternoon"],
    blurb: "Setúbal's famous Moscatel, poured slowly under stone arches.",
    anchorTourId: "arrabida-wine-allinclusive",
  }),
  s({
    id: "azeitao-winery-small",
    region: "arrabida",
    name: "Small-grower winery, Arrábida",
    kind: "winery",
    coords: { lat: 38.5051, lng: -9.0298 },
    dwellMin: 60, hours: { open: "11:00", close: "17:00" }, closedDays: [1, 7],
    priority: 7,
    affinity: { style: ["wine"], energy: ["slow"], social: ["intimate"] },
    timeOfDay: ["afternoon"],
    blurb: "Three-barrel cellar, the grower pours himself.",
  }),
  s({
    id: "azeitao-cheese-workshop",
    region: "arrabida",
    name: "Azeitão cheese workshop",
    kind: "workshop",
    coords: { lat: 38.5139, lng: -9.0058 },
    dwellMin: 60, hours: { open: "09:30", close: "17:00" }, closedDays: [7],
    priority: 8,
    affinity: { style: ["table", "heritage"], energy: ["slow"], companions: ["family", "couple"] },
    timeOfDay: ["morning"],
    blurb: "The cheese pressed in front of you, soft and warm.",
    anchorTourId: "azeitao-cheese",
  }),
  s({
    id: "traditional-lunch-azeitao",
    region: "arrabida",
    name: "Long traditional lunch",
    kind: "table",
    coords: { lat: 38.5128, lng: -9.0089 },
    dwellMin: 105, hours: { open: "12:30", close: "15:30" }, closedDays: [],
    priority: 9,
    affinity: { style: ["table"], energy: ["slow"], social: ["intimate", "shared"] },
    timeOfDay: ["midday"],
    blurb: "Regional plates and paired wines, the natural park through the window.",
    anchorTourId: "arrabida-wine-allinclusive",
  }),
  s({
    id: "arrabida-viewpoint",
    region: "arrabida",
    name: "Arrábida viewpoint",
    kind: "viewpoint",
    coords: { lat: 38.4842, lng: -8.9783 },
    dwellMin: 25, hours: null, closedDays: [],
    priority: 7,
    affinity: { style: ["coast", "heritage"], energy: ["slow", "vivid"] },
    timeOfDay: ["afternoon", "sunset"],
    blurb: "The road that drops, suddenly, into impossible blue.",
  }),
  s({
    id: "portinho-arrabida",
    region: "arrabida",
    name: "Portinho da Arrábida",
    kind: "beach",
    coords: { lat: 38.4815, lng: -8.9821 },
    dwellMin: 60, hours: null, closedDays: [],
    seasonalMonths: { from: 4, to: 10 },
    priority: 8,
    affinity: { style: ["coast"], energy: ["slow", "vivid"], social: ["shared"] },
    timeOfDay: ["afternoon"],
    blurb: "Sheltered cove, the kind of water you don't expect.",
    anchorTourId: "arrabida-boat",
  }),
  s({
    id: "arrabida-boat-coves",
    region: "arrabida",
    name: "Coves by boat, Arrábida",
    kind: "beach",
    coords: { lat: 38.4760, lng: -9.0021 },
    dwellMin: 150, hours: { open: "10:00", close: "17:00" }, closedDays: [],
    seasonalMonths: { from: 4, to: 10 },
    priority: 9,
    affinity: { style: ["coast"], energy: ["vivid"], social: ["shared"] },
    timeOfDay: ["midday", "afternoon"],
    blurb: "Hidden coves reached only from the water.",
    anchorTourId: "arrabida-boat",
  }),
  s({
    id: "sesimbra-harbour",
    region: "arrabida",
    name: "Sesimbra harbour",
    kind: "village",
    coords: { lat: 38.4434, lng: -9.1024 },
    dwellMin: 45, hours: null, closedDays: [],
    priority: 7,
    affinity: { style: ["coast"], energy: ["slow"] },
    timeOfDay: ["sunset"],
    blurb: "Fishing boats coming in, the light going soft.",
    anchorTourId: "arrabida-wine-allinclusive",
  }),

  // ── Lisbon coast (Sintra · Cascais) ───────────────────────────────────
  s({
    id: "sintra-estates",
    region: "lisbon-coast",
    name: "Sintra palace estates",
    kind: "heritage",
    coords: { lat: 38.7980, lng: -9.3878 },
    dwellMin: 120, hours: { open: "09:30", close: "18:00" }, closedDays: [],
    priority: 9,
    affinity: { style: ["heritage"], energy: ["slow"], companions: ["couple", "family"] },
    timeOfDay: ["morning"],
    blurb: "Mossy stone, painted ceilings, gardens that climb the hill.",
    anchorTourId: "sintra-cascais",
  }),
  s({
    id: "cabo-da-roca",
    region: "lisbon-coast",
    name: "Cabo da Roca",
    kind: "viewpoint",
    coords: { lat: 38.7806, lng: -9.4989 },
    dwellMin: 30, hours: null, closedDays: [],
    priority: 8,
    affinity: { style: ["coast"], energy: ["vivid"], social: ["shared"] },
    timeOfDay: ["afternoon", "sunset"],
    blurb: "The cliff where Europe stops.",
    anchorTourId: "sintra-cascais",
  }),
  s({
    id: "cascais-village",
    region: "lisbon-coast",
    name: "Cascais old town",
    kind: "village",
    coords: { lat: 38.6979, lng: -9.4215 },
    dwellMin: 60, hours: null, closedDays: [],
    priority: 6,
    affinity: { style: ["coast", "table"], energy: ["slow"] },
    timeOfDay: ["afternoon"],
    blurb: "Tiled lanes, ice cream, the bay opening behind you.",
    anchorTourId: "sintra-cascais",
  }),

  // ── Alentejo (Évora · Troia · Comporta) ───────────────────────────────
  s({
    id: "evora-old-town",
    region: "alentejo",
    name: "Évora historic centre",
    kind: "heritage",
    coords: { lat: 38.5713, lng: -7.9135 },
    dwellMin: 90, hours: null, closedDays: [],
    priority: 9,
    affinity: { style: ["heritage"], energy: ["slow"] },
    timeOfDay: ["morning"],
    blurb: "Roman temple, whitewashed walls, a cathedral with a roof you can walk.",
    anchorTourId: "evora-alentejo",
  }),
  s({
    id: "almendres-cromlech",
    region: "alentejo",
    name: "Almendres cromlech",
    kind: "heritage",
    coords: { lat: 38.5572, lng: -8.0608 },
    dwellMin: 40, hours: null, closedDays: [],
    priority: 7,
    affinity: { style: ["heritage"], energy: ["slow"], social: ["intimate"] },
    timeOfDay: ["morning"],
    blurb: "Stones older than the pyramids, standing under cork oaks.",
  }),
  s({
    id: "alentejo-winery-a",
    region: "alentejo",
    name: "Alentejo estate winery",
    kind: "winery",
    coords: { lat: 38.6021, lng: -7.7855 },
    dwellMin: 90, hours: { open: "10:00", close: "17:00" }, closedDays: [7],
    priority: 9,
    affinity: { style: ["wine"], energy: ["slow"] },
    timeOfDay: ["afternoon"],
    blurb: "Vines to the horizon, a long table under the eucalyptus.",
    anchorTourId: "evora-alentejo",
  }),
  s({
    id: "alentejo-winery-b",
    region: "alentejo",
    name: "Small Alentejo winery",
    kind: "winery",
    coords: { lat: 38.5421, lng: -7.7521 },
    dwellMin: 75, hours: { open: "10:30", close: "17:00" }, closedDays: [1, 7],
    priority: 7,
    affinity: { style: ["wine"], energy: ["slow"], social: ["intimate"] },
    timeOfDay: ["afternoon"],
    blurb: "Talha clay-pot wines, the way Romans did it.",
  }),
  s({
    id: "alentejo-long-lunch",
    region: "alentejo",
    name: "Long Alentejo lunch",
    kind: "table",
    coords: { lat: 38.5759, lng: -7.9078 },
    dwellMin: 120, hours: { open: "12:30", close: "15:30" }, closedDays: [],
    priority: 9,
    affinity: { style: ["table"], energy: ["slow"], social: ["intimate", "shared"] },
    timeOfDay: ["midday"],
    blurb: "Bread, cheese, black pork, slow time.",
  }),
  s({
    id: "troia-ferry",
    region: "alentejo",
    name: "Tróia ferry crossing",
    kind: "village",
    coords: { lat: 38.4926, lng: -8.8901 },
    dwellMin: 45, hours: { open: "07:00", close: "22:00" }, closedDays: [],
    priority: 6,
    affinity: { style: ["coast"], energy: ["slow"], social: ["shared"] },
    timeOfDay: ["morning"],
    blurb: "The river opens, dolphins on a good day.",
    anchorTourId: "troia-comporta",
  }),
  s({
    id: "comporta-beach",
    region: "alentejo",
    name: "Comporta beach",
    kind: "beach",
    coords: { lat: 38.3856, lng: -8.7822 },
    dwellMin: 90, hours: null, closedDays: [],
    seasonalMonths: { from: 4, to: 10 },
    priority: 8,
    affinity: { style: ["coast"], energy: ["slow", "vivid"] },
    timeOfDay: ["afternoon"],
    blurb: "Rice paddies behind, white sand in front, almost nobody.",
    anchorTourId: "troia-comporta",
  }),

  // ── Centro (Fátima · Nazaré · Óbidos · Tomar · Coimbra) ────────────────
  s({
    id: "fatima-sanctuary",
    region: "centro",
    name: "Fátima sanctuary",
    kind: "heritage",
    coords: { lat: 39.6320, lng: -8.6731 },
    dwellMin: 60, hours: null, closedDays: [],
    priority: 8,
    affinity: { style: ["heritage"], energy: ["slow"], social: ["intimate"] },
    timeOfDay: ["morning"],
    blurb: "Candles in daylight, an open square that goes quiet anyway.",
    anchorTourId: "fatima-nazare-obidos",
  }),
  s({
    id: "nazare",
    region: "centro",
    name: "Nazaré cliff & beach",
    kind: "village",
    coords: { lat: 39.6012, lng: -9.0706 },
    dwellMin: 75, hours: null, closedDays: [],
    priority: 7,
    affinity: { style: ["coast"], energy: ["vivid"] },
    timeOfDay: ["afternoon"],
    blurb: "Atlantic wind, the famous waves below.",
    anchorTourId: "fatima-nazare-obidos",
  }),
  s({
    id: "obidos",
    region: "centro",
    name: "Óbidos walled village",
    kind: "village",
    coords: { lat: 39.3597, lng: -9.1572 },
    dwellMin: 75, hours: null, closedDays: [],
    priority: 8,
    affinity: { style: ["heritage"], energy: ["slow"], companions: ["couple"] },
    timeOfDay: ["afternoon", "sunset"],
    blurb: "Whitewashed lanes inside medieval walls, ginja in chocolate cups.",
    anchorTourId: "fatima-nazare-obidos",
  }),
  s({
    id: "tomar-convento",
    region: "centro",
    name: "Convento de Cristo, Tomar",
    kind: "heritage",
    coords: { lat: 39.6038, lng: -8.4198 },
    dwellMin: 90, hours: { open: "09:00", close: "17:30" }, closedDays: [],
    priority: 9,
    affinity: { style: ["heritage"], energy: ["slow"] },
    timeOfDay: ["morning"],
    blurb: "Templar cloisters stacked on cloisters, the famous window.",
    anchorTourId: "tomar-coimbra",
  }),
  s({
    id: "coimbra-university",
    region: "centro",
    name: "Coimbra old university",
    kind: "heritage",
    coords: { lat: 40.2071, lng: -8.4263 },
    dwellMin: 90, hours: { open: "09:00", close: "18:00" }, closedDays: [],
    priority: 8,
    affinity: { style: ["heritage"], energy: ["slow"] },
    timeOfDay: ["afternoon"],
    blurb: "Baroque library, painted ceilings, the Mondego far below.",
    anchorTourId: "tomar-coimbra",
  }),
];

export function stopsInRegion(region: RegionKey): RegionStop[] {
  return REGION_STOPS.filter((s) => s.region === region);
}

export function stopById(id: string): RegionStop | undefined {
  return REGION_STOPS.find((s) => s.id === id);
}
