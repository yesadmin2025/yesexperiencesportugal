// Slice C (closure) — Per-stop traveller suitability registry.
//
// Every reachable Studio stop label (union of signatureTours[*].stops[*].label
// and REGION_STOP_POOL[*].name) MUST be present with an explicit `status`.
// A missing lookup returns `undefined` → treated as `unknown` at runtime →
// blocked for minor-carrying requests.
//
// Facts come from operational nature only (boat, cave, sand access, cellar
// floors, terrain). Never inferred from marketing copy.

import type { SuitabilityRecord } from "@/lib/pricing/travellerSuitability";

// --- category presets --------------------------------------------------------

const BOAT: SuitabilityRecord = {
  status: "confirmed",
  minimumAge: 4,
  infantsAllowed: false,
  strollerSuitable: false,
};

const CAVE: SuitabilityRecord = {
  status: "confirmed",
  minimumAge: 8,
  infantsAllowed: false,
  strollerSuitable: false,
};

const BEACH: SuitabilityRecord = {
  status: "explicitly-unrestricted",
  strollerSuitable: false,
};

const WINERY: SuitabilityRecord = {
  status: "explicitly-unrestricted",
  infantsAllowed: true,
  strollerSuitable: false,
};

const COAST_WALK: SuitabilityRecord = {
  status: "explicitly-unrestricted",
  strollerSuitable: false,
};

const OPEN: SuitabilityRecord = { status: "explicitly-unrestricted" };

// Quinta da Regaleira — gardens, caves, tunnels; uneven paths so strollers
// impractical, but no age gate for the property itself.
const HISTORIC_UNEVEN: SuitabilityRecord = {
  status: "explicitly-unrestricted",
  strollerSuitable: false,
};

// --- reachable labels (keyed lowercase) --------------------------------------

const RAW: Record<string, SuitabilityRecord> = {
  // Boats / island transfers
  "ilha do pessegueiro": BOAT,
  "marina de troia": BOAT,
  "baia de setubal — sado ferry crossing": BOAT,

  // Caves
  "lapa de santa margarida": CAVE,

  // Beaches / coastal access
  "comporta beach": BEACH,
  "praia do carvalhal": BEACH,
  "praia da nazare": BEACH,
  "praia da nazaré": BEACH,
  "praia de galapinhos": BEACH,
  "praia das bicas": BEACH,
  "praia do meco": BEACH,
  "portinho da arrabida": BEACH,
  "portinho da arrábida": BEACH,
  "azenhas do mar": BEACH,

  // Winery estates / cellars / craft workshops with cellar floors
  "adega coop. de palmela, c.r.l.": WINERY,
  "adega cooperativa de palmela": WINERY,
  "adega regional de colares": WINERY,
  "adega do mestre daniel · xxvi talhas": WINERY,
  "adega do mestre daniel — xxvi talhas": WINERY,
  "albergaria dos fusos": WINERY,
  "bacalhoa vinhos de portugal": WINERY,
  "bacalhôa vinhos de portugal": WINERY,
  "centro interpretativo do vinho de talha": WINERY,
  "enoturismo cartuxa": WINERY,
  "ervideira": WINERY,
  "herdade do esporao": WINERY,
  "herdade do esporão": WINERY,
  "joao portugal ramos wines": WINERY,
  "joão portugal ramos wines": WINERY,
  "pera-grave - qta s. jose de peramanca": WINERY,
  "pera-grave / quinta s. josé de peramanca": WINERY,
  "quinta velha": WINERY,
  "quinta do piloto": WINERY,
  "quinta de catralvos": WINERY,
  "farm catralvos": WINERY,
  "house & museum josé maria da fonseca": WINERY,
  "house & museum josé maria de fonseca": WINERY,
  "jose maria de fonseca": WINERY,
  "azeitao — long traditional lunch": WINERY,
  "azulejos de azeitao": WINERY,
  "azulejos de azeitão": WINERY,
  "corticarte - arte em cortica": WINERY,
  "corticarte — arte em cortiça": WINERY,

  // Coast walks / rugged natural parks — strollers impractical
  "cabo espichel": COAST_WALK,
  "cabo da roca": COAST_WALK,
  "parque natural da arrabida": COAST_WALK,
  "parque natural da arrábida": COAST_WALK,
  "parque natural do sudoeste alentejano e costa vicentina": COAST_WALK,
  "odeceixe": COAST_WALK,
  "aljezur": COAST_WALK,
  "vila nova de milfontes": COAST_WALK,
  "porto covo": COAST_WALK,
  "cais palafitico do porto da carrasqueira": COAST_WALK,
  "cais palafítico do porto da carrasqueira": COAST_WALK,

  // Historic property with uneven paths / gardens / caves (family-friendly)
  "quinta da regaleira": HISTORIC_UNEVEN,

  // Everything else — towns, palaces, museums, sanctuaries, chapels, castles,
  // universities, markets, viewpoints. No operational safety gate.
  "azeitao": OPEN,
  "azeitão": OPEN,
  "biblioteca joanina": OPEN,
  "cascais": OPEN,
  "castelo de obidos": OPEN,
  "castelo de óbidos": OPEN,
  "castelo de sesimbra": OPEN,
  "chapel of bones": OPEN,
  "capela dos ossos": OPEN,
  "coimbra": OPEN,
  "comporta": OPEN,
  "herdade da comporta": OPEN,
  "convento de cristo": OPEN,
  "evora": OPEN,
  "évora": OPEN,
  "fatima": OPEN,
  "fátima sanctuary": OPEN,
  "mercado do livramento": OPEN,
  "nazare": OPEN,
  "nazaré": OPEN,
  "obidos": OPEN,
  "óbidos": OPEN,
  "park and national palace of pena": OPEN,
  "roman ruins of troia": OPEN,
  "roman ruins of tróia": OPEN,
  "santuario nacional de cristo rei": OPEN,
  "santuário nacional de cristo rei": OPEN,
  "sesimbra": OPEN,
  "sintra": OPEN,
  "sintra national palace": OPEN,
  "templo romano de evora (templo de diana)": OPEN,
  "templo romano de évora": OPEN,
  "tomar": OPEN,
  "universita di coimbra": OPEN,
  "universidade de coimbra": OPEN,
  "vila alva": OPEN,
  "villa romana de são cucufate": OPEN,
};

export const STUDIO_STOP_SUITABILITY: Readonly<Record<string, SuitabilityRecord>> =
  Object.freeze(RAW);

export function getStopSuitability(label: string | null | undefined): SuitabilityRecord | undefined {
  if (!label) return undefined;
  return STUDIO_STOP_SUITABILITY[label.toLowerCase()];
}
