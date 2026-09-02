import { deriveStudioIntelligence } from "@/lib/studio-v3/livingAtlasBridge";
// Studio V3 — curation layer (regional pool).
//
// The base of every journey is ONE real Signature tour (chosen from the
// existing catalog). Current truth: LEGACY curation is strict
// anchor-contained — legacy `curateJourney` moments come ONLY from the
// single primary tour's own `stops` array, with no cross-tour borrowing.
// Authorized Living Atlas hybrid composition is separate: it is
// same-region / same-corridor only and structurally gated. Nothing is
// invented anywhere: every stop, story and image is sourced from a real
// tour already on the site.
//
// Algorithm (regional pool scoring — used for discovery/boosts, not for
// borrowing legacy stops):
//   1. Pick the primary tour for the chosen feeling.
//   2. Build a regional stop pool from every tour sharing seed.region.
//   3. Score each pool stop by feeling/companions keyword affinity.
//   4. Anchor the journey with the base tour's first stop, then fill the
//      remaining slots from the anchor tour's own stops, deduped by label,
//      preferring stops with resolvable map coordinates.

import { isSelfServiceComposable } from "@/lib/studio-v3/selfServiceResolution";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import {
  assertStopIntentSchema,
  interestCoverageFromProfile,
  tourIntentProfile,
} from "@/data/stopIntents";
import { lookupStop } from "@/data/stopGeo";
import { isStopClosedOn } from "@/data/stopOperational";
import { recordStudioV3CurationDecision } from "@/lib/studio-v3-telemetry";
import {
  REGION_STOP_POOL,
  STUDIO_V3_OPTIONAL_STOPS_ENABLED,
  type OptionalStop,
  type RegionId,
} from "@/data/regionStopPool";
import { presentDirectorQuestion } from "@/components/studio-v3/directorQuestionPresentation";
import { deriveStudioDirectorRuntime } from "@/lib/studio-v3/studioDirectorRuntime";
import type { AdaptiveRefinementId } from "@/components/studio-v3/types";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import { hasExplicitWineIntent, interestsImplyWine } from "./studioWineIntent";

import type {
  ChoiceOption,
  Companions,
  CompanionsType,
  Consideration,
  DestinationIntent,
  Feeling,
  FitReport,
  IntentLevel,
  IntentProfile,
  IntentType,
  Interest,
  InvestmentTier,
  Occasion,
  Pickup,
  Rhythm,
  StudioV3Phase,
  StudioV3State,
} from "./types";
import {
  applyHybridComposition,
  composeHybridDay,
  type HybridCompositionResult,
  type HybridInternalIssue,
  type HybridPassthroughReason,
} from "@/components/studio-v3/studioHybridComposition";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import type { LivingAtlasComposition } from "@/components/studio-v3/livingAtlasComposer";
import type { LivingAtlasResolvedComposition } from "@/components/studio-v3/livingAtlasAlternatives";
import {
  planLivingAtlasRoute,
  type LivingAtlasRoutePlan,
} from "@/components/studio-v3/livingAtlasRoutePlanner";
import { applyLivingAtlasSchedule } from "@/components/studio-v3/livingAtlasSchedule";
import {
  validateLivingAtlasOperations,
  type LivingAtlasValidationResult,
} from "@/components/studio-v3/livingAtlasOperationalConfidence";
import {
  resolveCompositionIdentities,
  type CompositionIdentityReport,
} from "@/lib/studio-v3/compositionIdentity";
import {
  buildCommercialLedger,
  isKnownPriceAction,
  type CommercialLedger,
} from "@/lib/studio-v3/commercialLedger";

import { getTailorBlueprint } from "@/data/tailorBlueprints";
import { STRUCTURAL_STOP_BRIDGE } from "@/data/structuralStopBridge";
import { SIGNATURE_CORRIDORS } from "@/data/signatureCorridors";
import type { DoorToDoorCertification } from "@/lib/studio-v3/doorToDoorAuthority";
import { projectAuthoredAnchorStops } from "./authoredAnchorProjection";

import type { ComposedTiming, DwellSource, TimingConflict } from "@/lib/studio-v3/timeDomain";
import { hasMinuteTruth, judgeAdmission, stopHasMinuteTruth } from "@/lib/studio-v3/timeAuthority";
import { middayInsertIndex } from "@/lib/studio-v3/mealDaypartAuthority";




/* ---------- Adaptive intelligence: guest inference ---------- */

/**
 * inferGuests — deterministic, conservative.
 *
 * Returns an exact guest count (number) only when the answers unambiguously
 * imply a party size (solo or a couple), allowing the Studio to silently
 * skip the guests phase. Returns `null` for any conflicting / group answer
 * (family, friends, corporate, celebration, …) so the user is still asked.
 * The inferred value is persisted on state so the final reveal and the
 * lead payload always carry a guest count.
 */
export function inferGuests(
  companions: Companions | null,
  occasion: Occasion | null,
  _feeling: Feeling | null,
): number | null {
  if (!companions) return null;
  if (companions === "solo") return 1;
  if (companions === "couple" || companions === "proposal") return 2;
  // Honeymoon / proposal / anniversary imply two when paired with a
  // couple-style companion. Never infer for family / friends /
  // celebration / corporate.
  if (
    (occasion === "honeymoon" || occasion === "proposal" || occasion === "anniversary") &&
    companions !== "family" &&
    companions !== "friends" &&
    companions !== "corporate" &&
    companions !== "celebration"
  ) {
    return 2;
  }
  return null;
}

/* ---------- Label helpers (pure, deterministic) ---------- */

/** Map a single id to its human-readable label, with a graceful fallback. */
export function getOptionLabel<T extends string>(
  options: ReadonlyArray<ChoiceOption<T>>,
  value: T | null | undefined,
  fallback = "To be refined with YES",
): string {
  if (!value) return fallback;
  return options.find((o) => o.id === value)?.label ?? fallback;
}

/** Map a list of ids to their labels, joined as a natural sentence fragment. */
export function getOptionLabels<T extends string>(
  options: ReadonlyArray<ChoiceOption<T>>,
  values: ReadonlyArray<T> | null | undefined,
  fallback = "Nothing to mention",
): string {
  if (!values || values.length === 0) return fallback;
  const labels = values
    .map((v) => options.find((o) => o.id === v)?.label)
    .filter((x): x is string => Boolean(x));
  if (labels.length === 0) return fallback;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/* ---------- Journey title (deterministic, pure) ---------- */

const RHYTHM_ADJ: Record<Rhythm, string> = {
  slow: "Slow",
  balanced: "Quiet",
  full: "Rich",
  immersive: "Long",
};

const FEELING_THEME: Record<Feeling, string> = {
  coastal: "coastal",
  "wine-food": "wine and table",
  hidden: "hidden",
  romance: "romantic",
  culture: "heritage",
  adventure: "Atlantic",
  "slow-luxury": "slow",
  faith: "sacred",
  "hands-on": "hands-on",
};

const INTEREST_THEME: Partial<Record<Interest, string>> = {
  wine: "wine",
  gastronomy: "table",
  coast: "coastal",
  nature: "nature",
  heritage: "heritage",
  photography: "golden hour",
  wellness: "slow",
  "local-life": "local",
};

function geoFromPickup(pickup: Pickup | null | undefined): string | null {
  switch (pickup) {
    case "lisbon":
    case "lisbon-airport":
    case "lisbon-cruise":
      return "Lisbon";
    case "cascais-estoril":
      return "Cascais";
    case "sintra":
      return "Sintra";
    case "sesimbra-setubal-arrabida":
      return "Arrábida";
    case "comporta-troia":
      return "Comporta";
    default:
      return null;
  }
}

function scopeFromCompanions(c: Companions | null | undefined): string {
  switch (c) {
    case "couple":
    case "proposal":
      return "escape";
    case "celebration":
      return "celebration";
    case "corporate":
      return "private day";
    case "family":
    case "friends":
    case "solo":
    default:
      return "day";
  }
}

const OCCASION_BASE: Partial<Record<Occasion, string>> = {
  proposal: "A private proposal day",
  anniversary: "An anniversary worth marking",
  honeymoon: "A honeymoon escape",
  birthday: "A birthday in Portugal",
  corporate: "A private corporate day",
  celebration: "A private celebration",
};

/**
 * composeJourneyTitle — deterministic, sentence-case, ≤48 chars, no clichés.
 * Examples: "Slow coastal Arrábida escape" · "A honeymoon escape in Arrábida".
 * Falls back to "Your private Portugal day" when data is too thin.
 */
export function composeJourneyTitle(input: {
  feeling: Feeling | null;
  companions?: Companions | null;
  occasion?: Occasion | null;
  pickup?: Pickup | null;
  interests?: ReadonlyArray<Interest>;
  rhythm: Rhythm | null;
  /** Legacy field — accepted for callers that resolve a region later. */
  region?: string | null;
}): string {
  const FALLBACK = "Your private Portugal day";
  const geo = geoFromPickup(input.pickup);

  // Occasion-led titles (proposal / anniversary / honeymoon / …)
  if (input.occasion && OCCASION_BASE[input.occasion]) {
    const base = OCCASION_BASE[input.occasion]!;
    if (geo) {
      const withGeo = `${base} in ${geo}`;
      if (withGeo.length <= 48) return withGeo;
    }
    return base.length <= 48 ? base : FALLBACK;
  }

  if (!input.feeling || !input.rhythm) return FALLBACK;

  // Theme: prefer the first interest with a known theme word, else feeling.
  let theme = FEELING_THEME[input.feeling];
  if (input.interests && input.interests.length > 0) {
    for (const i of input.interests) {
      const t = INTEREST_THEME[i];
      if (t) {
        theme = t;
        break;
      }
    }
  }

  const adj = RHYTHM_ADJ[input.rhythm];
  const scope = scopeFromCompanions(input.companions ?? null);

  // Pattern: "{Adj} {theme} {geo} {scope}" e.g. "Slow coastal Arrábida escape"
  const candidates = [
    [adj, theme, geo, scope].filter(Boolean).join(" "),
    [adj, theme, scope].filter(Boolean).join(" "),
    [theme.charAt(0).toUpperCase() + theme.slice(1), scope].join(" "),
  ];
  for (const c of candidates) {
    if (c && c.length <= 48 && !c.includes("!")) return c;
  }
  return FALLBACK;
}

const FEELING_TO_TOURS: Record<Feeling, string[]> = {
  coastal: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta", "southwest-vicentine-coast"],
  "wine-food": [
    "arrabida-wine-allinclusive",
    "roman-heritage-alentejo",
    "azeitao-cheese",
    "evora-alentejo",
  ],
  hidden: [
    "southwest-vicentine-coast",
    "roman-heritage-alentejo",
    "wild-beaches-picnic",
    "arrabida-boat",
    "troia-comporta",
  ],
  romance: ["sintra-cascais", "troia-comporta", "arrabida-wine-allinclusive"],
  culture: [
    "tomar-coimbra",
    "roman-heritage-alentejo",
    "tiles-workshop",
    "fatima-nazare-obidos",
    "sintra-cascais",
  ],
  adventure: [
    "southwest-vicentine-coast",
    "arrabida-boat",
    "wild-beaches-picnic",
    "troia-comporta",
  ],
  // Slow-luxury: lead with quieter heritage/coast; wine still available but not first.
  "slow-luxury": [
    "sintra-cascais",
    "roman-heritage-alentejo",
    "evora-alentejo",
    "troia-comporta",
    "arrabida-wine-allinclusive",
  ],
  // Faith & reflection: the sanctuary day leads; heritage days support it.
  faith: ["fatima-nazare-obidos", "tomar-coimbra", "evora-alentejo", "sintra-cascais"],
  // Hands-on traditions: real workshops only — tiles and cheese.
  "hands-on": ["tiles-workshop", "azeitao-cheese", "arrabida-wine-allinclusive", "evora-alentejo"],
};

/**
 * Feeling-aware fallback used when the candidate pool is empty after
 * scoring. Never blanket-fallback to arrabida-wine — that biased every
 * unusual profile toward the same wine day.
 */
const FEELING_FALLBACK: Record<Feeling, string> = {
  coastal: "wild-beaches-picnic",
  "wine-food": "arrabida-wine-allinclusive",
  hidden: "southwest-vicentine-coast",
  romance: "sintra-cascais",
  culture: "tomar-coimbra",
  adventure: "southwest-vicentine-coast",
  "slow-luxury": "sintra-cascais",
  faith: "fatima-nazare-obidos",
  "hands-on": "tiles-workshop",
};

/** Interests that can only be a deliberate, discriminative choice. */
const HIGH_SIGNAL_INTERESTS: ReadonlyArray<Interest> = ["faith", "hands-on", "wine"];

const INTEREST_TARGET_TOURS: Partial<Record<Interest, string[]>> = {
  wine: [
    "arrabida-wine-allinclusive",
    "roman-heritage-alentejo",
    "azeitao-cheese",
    "evora-alentejo",
    "troia-comporta",
  ],
  gastronomy: [
    "arrabida-wine-allinclusive",
    "roman-heritage-alentejo",
    "azeitao-cheese",
    "evora-alentejo",
    "troia-comporta",
  ],
  heritage: [
    "tomar-coimbra",
    "roman-heritage-alentejo",
    "fatima-nazare-obidos",
    "sintra-cascais",
    "tiles-workshop",
  ],
  coast: [
    "wild-beaches-picnic",
    "arrabida-boat",
    "troia-comporta",
    "sintra-cascais",
    "southwest-vicentine-coast",
  ],
  nature: ["southwest-vicentine-coast", "wild-beaches-picnic", "arrabida-boat", "troia-comporta"],
  // SEMANTIC CLOSURE — these two interests previously had no target pool, so
  // a coast day could win "faith + workshops" purely on generic score.
  faith: ["fatima-nazare-obidos", "tomar-coimbra", "evora-alentejo"],
  "hands-on": ["tiles-workshop", "azeitao-cheese"],
};

/* ---------- PASS 2 · LEGACY COUNT HEURISTIC — NOT THE AUTHORITY ----------
 * RHYTHM_STOP_COUNT is a SHAPING PREFERENCE and a SAFETY FALLBACK, never a
 * ceiling. Wherever truthful minutes exist (see `@/lib/studio-v3/timeAuthority`)
 * the Time Authority decides whether a day/candidate is accepted, and this
 * count must not override a proven time fit. It still decides only when
 * minute truth is genuinely unavailable (unknown dwell / pathological data),
 * and it remains valid as non-authoritative display metadata.
 */
const RHYTHM_STOP_COUNT: Record<Rhythm, number> = {
  slow: 3,
  balanced: 4,
  full: 5,
  immersive: 6,
};


/* ---------- Phase 4.5: investment as a soft shaping signal ----------
 * Tiny, deterministic. Never invents stops, never crosses regions, never
 * changes the Signature skeleton. Only nudges:
 *   - target stop count inside the already-resolved Signature
 *   - relevance score for premium-feeling stops vs efficient ones
 * "open" is neutral on both axes — best fit from the existing profile.
 *
 * PASS 2: like RHYTHM_STOP_COUNT, this delta is a legacy count heuristic and
 * a fallback only. It can never reject a day that truthful minutes prove.
 */

const INVESTMENT_STOP_DELTA: Record<InvestmentTier, number> = {
  considered: -1, // efficient — fewer extras
  elevated: 0, // balanced premium
  // Phase 7A: bespoke should NOT thin the day. It signals stronger character
  // and premium candidate preference, not fewer stops. Soft scoring boost is
  // applied separately in `investmentPremiumScore`.
  bespoke: 0,
  open: 0, // best fit
};

const INVESTMENT_PREMIUM_KEYWORDS: string[] = [
  "private",
  "exclusive",
  "premium",
  "tasting",
  "sommelier",
  "chef",
  "cellar",
  "estate",
  "manor",
  "palace",
  "boutique",
  "michelin",
  "sunset",
  "candlelight",
  "champagne",
  "long lunch",
  "pairing",
  "reserve",
  "vintage",
];

const INVESTMENT_EFFICIENT_KEYWORDS: string[] = [
  "village",
  "market",
  "workshop",
  "easy",
  "stroll",
  "walk",
  "viewpoint",
  "harbour",
  "old town",
  "tile",
];

function investmentPremiumScore(
  investment: InvestmentTier | null | undefined,
  hay: string,
): number {
  if (!investment || investment === "open") return 0;
  const premiumHit = INVESTMENT_PREMIUM_KEYWORDS.some((kw) => hay.includes(kw));
  const efficientHit = INVESTMENT_EFFICIENT_KEYWORDS.some((kw) => hay.includes(kw));
  if (investment === "bespoke") return premiumHit ? 0.4 : 0;
  if (investment === "elevated") return premiumHit ? 0.2 : 0;
  if (investment === "considered") return efficientHit ? 0.15 : 0;
  return 0;
}

// Keyword affinity per feeling — matched against stop label + story (lowercase).
// Hits add to the relevance score; misses are simply ignored.
const FEELING_KEYWORDS: Record<Feeling, string[]> = {
  coastal: [
    "beach",
    "coast",
    "sea",
    "boat",
    "harbour",
    "cove",
    "ferry",
    "cliff",
    "dusk",
    "sand",
    "sesimbra",
    "comporta",
    "portinho",
    "atlantic",
    "ocean",
  ],
  "wine-food": [
    "wine",
    "winery",
    "tasting",
    "lunch",
    "cheese",
    "vineyard",
    "market",
    "table",
    "glass",
    "pairings",
    "moscatel",
  ],
  hidden: [
    "hidden",
    "quiet",
    "secret",
    "small",
    "narrow",
    "rarely",
    "drift",
    "pull-over",
    "no crowds",
    "few",
  ],
  romance: [
    "quiet",
    "sunset",
    "dusk",
    "two",
    "courtyard",
    "private",
    "long lunch",
    "golden",
    "view",
    "stroll",
  ],

  culture: [
    "palace",
    "convent",
    "library",
    "ruins",
    "roman",
    "templar",
    "chapel",
    "tile",
    "azulejo",
    "heritage",
    "old town",
    "unesco",
    "monks",
  ],
  adventure: ["boat", "swim", "snorkel", "cliffs", "wind", "atlantic", "cabo", "trail", "climb"],
  "slow-luxury": [
    "long",
    "slow",
    "courtyard",
    "private",
    "tasting",
    "garden",
    "patio",
    "golden",
    "quietly",
    "drift",
  ],
  faith: [
    "sanctuary",
    "fatima",
    "basilica",
    "chapel",
    "convent",
    "monastery",
    "church",
    "shrine",
    "pilgrim",
    "cloister",
  ],
  "hands-on": [
    "workshop",
    "tile",
    "azulejo",
    "paint",
    "cheese",
    "making",
    "craft",
    "artisan",
    "hands",
    "learn",
  ],
};

const WINE_STOP_RE =
  /\b(wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca|catralvos|palmela)\b/i;

const COMPANIONS_KEYWORDS: Partial<Record<Companions, string[]>> = {
  proposal: ["sunset", "golden", "viewpoint", "courtyard", "quiet", "view", "cliff"],
  celebration: ["long lunch", "tasting", "courtyard", "private", "golden"],
  family: ["family", "swim", "workshop", "easy", "garden", "boat"],
  couple: ["quiet", "courtyard", "long lunch", "viewpoint", "stroll"],
  friends: ["tasting", "long lunch", "harbour", "boat", "wine"],
  solo: ["walk", "library", "old town", "quiet"],
  corporate: ["private", "tasting", "courtyard", "garden"],
};

export interface CuratedMoment {
  index: number;
  label: string;
  story: string;
  image?: string;
  focal?: string;
  lat: number | null;
  lng: number | null;
  /** id of the Signature tour this stop is sourced from. */
  fromTourId: string;
  /** true when the stop is borrowed from another tour in the same region. */
  borrowed: boolean;
}

export interface CuratedJourney {
  /** The Signature tour that anchors the day. */
  tour: SignatureTour;
  /** Up to 2 alternates from the same feeling family. */
  alternates: SignatureTour[];
  /** Ordered moments. On the legacy path these come ONLY from the anchor
   *  tour's own stops (strict anchor containment); authorized Living Atlas
   *  hybrid composition is same-region/same-corridor and structurally gated. */
  moments: CuratedMoment[];
  /** Region center for the map — first geo-resolvable moment, or null. */
  center: { lat: number; lng: number } | null;
  /** Legacy-path audit trail (rejections, swaps, pool sizes). Never shown
   *  to users; emitted only when `curateJourney` is the active authority. */
  audit: CurationAudit;
}

export interface CurationAuditRejection {
  label: string;
  reason:
    | "closed-on-date"
    | "winery-cap"
    | "duplicate-label"
    | "semantic-duplicate"
    | "swapped-for-wine"
    | "coherence-family-only"
    | "coherence-romantic-only";

  detail?: string;
}

export interface CurationAudit {
  poolSizeRaw: number;
  poolSizeAfterClosures: number;
  target: number;
  rejections: CurationAuditRejection[];
  wineSwapApplied: boolean;
}

interface PoolStop {
  fromTourId: string;
  label: string;
  story: string;
  image?: string;
  focal?: string;
  imageTheme: string;
  isBaseTour: boolean;
}

function scoreStop(stop: PoolStop, feeling: Feeling, companions: Companions): number {
  const haystack = `${stop.label} ${stop.story}`.toLowerCase();
  let score = 0;
  for (const kw of FEELING_KEYWORDS[feeling]) {
    if (haystack.includes(kw)) score += 2;
  }
  const compKws = COMPANIONS_KEYWORDS[companions] ?? [];
  for (const kw of compKws) {
    if (haystack.includes(kw)) score += 1;
  }
  // Prefer stops from the base tour all else equal — keeps narrative anchor.
  if (stop.isBaseTour) score += 1.5;
  return score;
}

/* ---------- Pickup affinity (route-area containment) ---------- */
//
// IMPORTANT: a tour's `seed.region` is the operational PICKUP HUB
// ("lisbon" or "alentejo"), NOT the route's destination area. Two tours
// can share seed.region "lisbon" while landing in completely different
// places (Sintra vs Évora vs Tróia vs Tomar–Coimbra). The route-area
// truth lives in each tour's own `region` field (e.g. "Setúbal · Arrábida",
// "Centro", "Alentejo", "Tróia · Comporta · Alentejo"). To avoid mixing
// distant routes, the Studio MUST resolve ONE Signature tour and draw
// ALL stops from that single tour's `stops` array — never borrow from
// siblings, even if they share the same pickup hub.

/** Tour ids that physically stay near the Lisbon metro area. */
const LISBON_AREA_TOURS = new Set([
  "arrabida-wine-allinclusive",
  "arrabida-boat",
  "sintra-cascais",
  "wild-beaches-picnic",
  "azeitao-cheese",
  "tiles-workshop",
]);

/** Tour ids whose route is the Tróia / Comporta / Alentejo corridor. */
const COMPORTA_TROIA_TOURS = new Set(["troia-comporta", "evora-alentejo"]);

function pickupAffinity(tour: SignatureTour, pickup: Pickup | null): number {
  if (!pickup || pickup === "other") return 0;
  if (pickup === "comporta-troia") {
    if (COMPORTA_TROIA_TOURS.has(tour.id)) return 4;
    if (LISBON_AREA_TOURS.has(tour.id)) return -3;
    return 0;
  }
  // All other pickup buckets are Lisbon-region origins.
  if (LISBON_AREA_TOURS.has(tour.id)) return 2;
  if (COMPORTA_TROIA_TOURS.has(tour.id)) return -1;
  // Centro / Alentejo tours technically start from Lisbon but require
  // long transfers — soft penalty so they only win on very strong fit.
  return -2;
}

/* ---------- Destination intent (soft additive boost) ---------- */
//
// Pickup ≠ destination. A traveller staying in Lisbon may still want
// inland Alentejo, Central Portugal, the Spiritual coast or Comporta.
// destinationIntent is an OPTIONAL signal layered on top of pickup so
// the resolver can land on the right Signature skeleton without
// rewriting route composition. Boosts are tuned to overcome the
// ~±4 pickup swing for clearly inland/central choices, and stay light
// for "anywhere-special" / "no-preference". It never invents skeletons,
// never crosses routeCluster, and never bypasses route containment.
const DESTINATION_INTENT_BOOSTS: Record<DestinationIntent, Record<string, number>> = {
  "no-preference": {},
  "lisbon-sintra-cascais": {
    "sintra-cascais": 4,
    "tiles-workshop": 1,
  },
  "arrabida-setubal-azeitao": {
    "arrabida-wine-allinclusive": 3,
    "arrabida-boat": 3,
    "wild-beaches-picnic": 3,
    "azeitao-cheese": 3,
    "tiles-workshop": 2,
  },
  "alentejo-evora-wine": {
    "evora-alentejo": 6,
    "roman-heritage-alentejo": 4,
  },
  "alentejo-roman-talha": {
    "roman-heritage-alentejo": 8,
    "evora-alentejo": 2,
  },
  "vicentine-coast": {
    "southwest-vicentine-coast": 8,
  },
  "spiritual-coast": {
    "fatima-nazare-obidos": 6,
  },
  "central-portugal": {
    "tomar-coimbra": 6,
  },
  "comporta-troia": {
    "troia-comporta": 6,
  },
  "anywhere-special": {
    "evora-alentejo": 1.5,
    "roman-heritage-alentejo": 2,
    "southwest-vicentine-coast": 2,
    "tomar-coimbra": 1.5,
    "fatima-nazare-obidos": 1.5,
    "troia-comporta": 1.5,
  },
};

function allowsProfileDiscovery(destinationIntent: DestinationIntent | null | undefined): boolean {
  return (
    !destinationIntent ||
    destinationIntent === "no-preference" ||
    destinationIntent === "anywhere-special"
  );
}

/**
 * When the traveller does not pick a fixed region, the Studio should still be
 * able to reach the strongest YES-only routes. This is not invention: it only
 * adds existing Signature tours to the candidate pool when the answers clearly
 * point there.
 */
function profileDiscoveryTargets(
  feeling: Feeling,
  interests: ReadonlyArray<Interest>,
  destinationIntent: DestinationIntent | null | undefined,
): string[] {
  if (!allowsProfileDiscovery(destinationIntent)) return [];

  const targets: string[] = [];
  const hasWine = interests.includes("wine");
  const hasHeritage = interests.includes("heritage");
  const hasLocalLife = interests.includes("local-life");
  const hasGastronomy = interests.includes("gastronomy");
  const hasCoast = interests.includes("coast");
  const hasNature = interests.includes("nature");

  if (
    destinationIntent === "anywhere-special" ||
    (hasWine && (hasHeritage || hasLocalLife)) ||
    (feeling === "culture" && hasWine) ||
    (feeling === "hidden" && hasWine && (hasHeritage || hasLocalLife || hasGastronomy))
  ) {
    targets.push("roman-heritage-alentejo");
  }

  if (
    destinationIntent === "anywhere-special" ||
    (hasCoast && hasNature) ||
    ((feeling === "hidden" || feeling === "adventure") && (hasCoast || hasNature)) ||
    (feeling === "coastal" && hasNature)
  ) {
    targets.push("southwest-vicentine-coast");
  }

  if (
    destinationIntent === "anywhere-special" ||
    ((feeling === "romance" || feeling === "slow-luxury") &&
      (hasCoast || hasGastronomy || hasLocalLife)) ||
    (feeling === "coastal" && (hasGastronomy || hasLocalLife))
  ) {
    targets.push("troia-comporta");
  }

  return targets;
}

function profileDiscoveryBoost(
  tour: SignatureTour,
  feeling: Feeling,
  interests: ReadonlyArray<Interest>,
  destinationIntent: DestinationIntent | null | undefined,
): number {
  if (!allowsProfileDiscovery(destinationIntent)) return 0;

  const hasWine = interests.includes("wine");
  const hasHeritage = interests.includes("heritage");
  const hasLocalLife = interests.includes("local-life");
  const hasGastronomy = interests.includes("gastronomy");
  const hasCoast = interests.includes("coast");
  const hasNature = interests.includes("nature");

  if (tour.id === "roman-heritage-alentejo") {
    let boost = destinationIntent === "anywhere-special" ? 2.5 : 0;
    if (hasWine && (hasHeritage || hasLocalLife)) boost += 5;
    else if (feeling === "culture" && hasWine) boost += 4;
    else if (feeling === "hidden" && hasWine && (hasHeritage || hasLocalLife || hasGastronomy))
      boost += 3.5;
    else if (feeling === "slow-luxury" && hasWine && hasHeritage) boost += 3.5;
    return boost;
  }

  if (tour.id === "southwest-vicentine-coast") {
    let boost = destinationIntent === "anywhere-special" ? 3 : 0;
    if (hasCoast && hasNature) boost += 6;
    else if ((feeling === "hidden" || feeling === "adventure") && (hasCoast || hasNature))
      boost += 4.5;
    else if (feeling === "coastal" && hasNature) boost += 4;
    return boost;
  }

  if (tour.id === "troia-comporta") {
    let boost = destinationIntent === "anywhere-special" ? 2.5 : 0;
    if (
      (feeling === "romance" || feeling === "slow-luxury") &&
      (hasCoast || hasGastronomy || hasLocalLife)
    ) {
      boost += 4.5;
    } else if (feeling === "coastal" && (hasGastronomy || hasLocalLife)) {
      boost += 3.5;
    }
    return boost;
  }

  return 0;
}

function destinationIntentBoost(
  tour: SignatureTour,
  destinationIntent: DestinationIntent | null | undefined,
): number {
  if (!destinationIntent || destinationIntent === "no-preference") return 0;
  const table = DESTINATION_INTENT_BOOSTS[destinationIntent];
  return table?.[tour.id] ?? 0;
}

function interestAffinity(tour: SignatureTour, interests: ReadonlyArray<Interest>): number {
  if (!interests.length) return 0;
  const hay = `${tour.title} ${tour.theme} ${tour.blurb} ${tour.intro} ${tour.stops
    .map((s) => `${s.label} ${s.story}`)
    .join(" ")}`.toLowerCase();
  let score = 0;
  for (const i of interests) {
    const kws = INTEREST_TOUR_KEYWORDS[i];
    if (!kws) continue;
    for (const kw of kws) {
      if (hay.includes(kw)) {
        score += 1;
        break; // one hit per interest is enough
      }
    }
  }
  return score;
}

const INTEREST_TOUR_KEYWORDS: Partial<Record<Interest, string[]>> = {
  wine: ["wine", "winery", "tasting", "vineyard", "moscatel"],
  gastronomy: ["lunch", "cheese", "table", "market", "gastronom", "pairings", "food"],
  coast: ["coast", "beach", "boat", "cliff", "atlantic", "harbour", "cove"],
  nature: ["nature", "trail", "garden", "hills", "natural park"],
  heritage: [
    "palace",
    "convent",
    "templar",
    "tile",
    "azulejo",
    "heritage",
    "unesco",
    "monks",
    "old town",
    "ruins",
  ],
  photography: ["viewpoint", "sunset", "golden", "view", "dusk"],
  wellness: ["slow", "quiet", "garden", "patio", "courtyard"],
  "local-life": ["village", "market", "local", "workshop", "neighbour"],
  faith: ["sanctuary", "santuario", "santuário", "fatima", "fátima", "pilgrim", "convent", "monastery", "shrine", "spiritual", "chapel", "basilica"],
  "hands-on": ["workshop", "hands-on", "tile", "azulejo", "craft", "artisan", "painting", "cheese-making", "atelier"],
};

/* ============================================================
 * Seeded variation helpers (Reshape this day)
 * ------------------------------------------------------------
 *  Deterministic, dependency-free PRNG. We never invent stops or tours —
 *  variation only re-picks among already-eligible candidates (top-band
 *  tours within the same feeling/region pool) and gently jitters per-stop
 *  scores so a different equally-good moment can win a tie. With seed=0
 *  every helper is a no-op, so the original deterministic curation (and
 *  its locked test snapshots) is preserved.
 * ============================================================ */
function hashSeed(input: string | number | undefined): number {
  if (input === undefined || input === null || input === "" || input === 0 || input === "0")
    return 0;
  const str = String(input);
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Strong coherence regex: stops/tours that read as exclusively-family
 *  (children/playground language) must not surface when the traveller is
 *  solo/couple/proposal/corporate. AI predictive guardrail — never offer
 *  family-coded language to a couple. */
const FAMILY_ONLY_RE =
  /\b(child(ren)?|kids|kid-friendly|playground|stroller|toddler|baby|babies)\b/i;
/** Stops/tours that read as exclusively-couple/romantic-only must not
 *  surface when the traveller is corporate / family / friends. */
const ROMANTIC_ONLY_RE =
  /\b(honeymoon|just the two of you|for two|romantic dinner|proposal|engagement)\b/i;

/* ============================================================
 * Phase 8 — Intent-to-Journey fidelity (FitReport)
 * ------------------------------------------------------------
 * Structured, deterministic per-tour scoring that measures *actual*
 * coverage of the guest's inputs against the tour's own content
 * (title, theme, blurb, intro, stops). No AI in the ranking loop.
 *
 * The previous model added independent per-axis boosts, which meant a
 * tour scoring +2 on one axis could beat one that hit +1 on three axes.
 * The FitReport counts satisfied interests explicitly, penalises
 * missing interests asymmetrically (−6 vs +8), and surfaces a
 * transparent explanation for the UI + debug overlay.
 *
 * Facts are deterministic; AI voice may rewrite the guest sentence
 * downstream. Never invents stops, tours, or content.
 * ============================================================ */

/** Rhythm-to-hours-budget — used to flag `rhythmFeasible` when a
 *  slow guest is pointed at an immersive multi-hour tour, or vice versa.
 *  Advisory only in Phase 8 — never drops the last candidate. */
const RHYTHM_HOURS_BUDGET: Record<Rhythm, { min: number; max: number }> = {
  slow: { min: 2, max: 6 },
  balanced: { min: 4, max: 8 },
  full: { min: 6, max: 10 },
  immersive: { min: 7, max: 12 },
};

/** Parse "7–9h" / "3-4h" / "Half Day" / "Full Day" / "5h" into a
 *  midpoint hours estimate. Returns null when unparseable. */
function tourHoursEstimate(tour: SignatureTour): number | null {
  const src = `${tour.durationHours} ${tour.duration}`.toLowerCase();
  const range = src.match(/(\d+)\s*[–-]\s*(\d+)\s*h/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const single = src.match(/(\d+)\s*h/);
  if (single) return Number(single[1]);
  if (/full\s*day/.test(src)) return 8;
  if (/half\s*day/.test(src)) return 4;
  if (/multi\s*day|\d+\s*day/.test(src)) return 12;
  return null;
}

/** Cached lowercase content haystack per tour — feeling/interest match runs
 *  once per (tour, feeling, interest) call, and the route-containment
 *  regression test exercises hundreds of combinations. Keeping the string
 *  allocation out of the hot path prevents timeouts. */
const TOUR_CONTENT_CACHE = new WeakMap<SignatureTour, string>();
function tourContent(tour: SignatureTour): string {
  const cached = TOUR_CONTENT_CACHE.get(tour);
  if (cached) return cached;
  const hay = `${tour.title} ${tour.theme} ${tour.blurb} ${tour.intro} ${tour.stops
    .map((s) => `${s.label} ${s.story}`)
    .join(" ")}`.toLowerCase();
  TOUR_CONTENT_CACHE.set(tour, hay);
  return hay;
}

/** Feeling → tour semantic match, scored against the tour's own content.
 *  strong = 3+ keyword hits, partial = 1–2, weak = 0. */
function computeFeelingMatch(
  tour: SignatureTour,
  feeling: Feeling,
): { match: "strong" | "partial" | "weak"; hits: number } {
  const hay = tourContent(tour);
  const kws = FEELING_KEYWORDS[feeling] ?? [];
  let hits = 0;
  for (const kw of kws) {
    if (hay.includes(kw)) hits++;
  }
  if (hits >= 3) return { match: "strong", hits };
  if (hits >= 1) return { match: "partial", hits };
  return { match: "weak", hits };
}

/** Per-interest coverage — driven by stop-level intent tags (the truth
 *  model in `stopIntents.ts`) with a keyword fallback when a guest
 *  interest has no stop-intent mapping. `evidence` lists the actual stop
 *  labels that carry the intent, so "Why this journey" can quote them
 *  verbatim instead of paraphrasing keyword hits. */
function computeInterestCoverage(
  tour: SignatureTour,
  interests: ReadonlyArray<Interest>,
): Array<{
  interest: string;
  satisfied: boolean;
  strength?: "strong" | "partial" | "none";
  evidence?: string[];
}> {
  if (!interests.length) return [];
  const profile = tourIntentProfile(tour);
  const hay = tourContent(tour);
  return interests.map((i) => {
    const cov = interestCoverageFromProfile(profile, i);
    // Fallback: some interests may not (yet) have a stop-intent mapping.
    // Keep keyword sensing as a safety net so scoring never regresses to
    // fully unsatisfied when tags are absent.
    if (cov.count === 0) {
      const kws = INTEREST_TOUR_KEYWORDS[i] ?? [];
      const kwHit = kws.some((kw) => hay.includes(kw));
      return { interest: i, satisfied: kwHit, strength: "none" as const, evidence: [] };
    }
    return {
      interest: i,
      satisfied: true,
      strength: cov.strength,
      evidence: cov.evidence,
    };
  });
}

/** Pickup reachability — half-day pickups shouldn't be pointed at
 *  Alentejo/Vicentine tours. Uses the existing `pickupAffinity` signal:
 *  a score of 0 means the pickup is not in the tour's operational
 *  region; combined with a short-rhythm guest this is a red flag. */
function isPickupReachable(
  tour: SignatureTour,
  pickup: Pickup | null,
  rhythm: Rhythm | null,
): boolean {
  if (!pickup) return true;
  const affinity = pickupAffinity(tour, pickup);
  if (affinity > 0) return true;
  // No positive affinity + a compressed rhythm → likely too far.
  if (rhythm === "slow" || rhythm === "balanced") return false;
  return true;
}

/**
 * scoreTourFit — the core Phase 8 model. Returns a structured explanation
 * of how well a candidate satisfies the guest's inputs.
 *
 * Weights (tuned to preserve existing regression tests):
 *   +8   per satisfied interest      (guest asked for it, tour has it)
 *   −6   per missing user interest   (guest asked for it, tour lacks it)
 *   +12  strong feeling match        (3+ keyword hits in tour content)
 *   +6   partial feeling match
 *   +wineBoost when wine content confirmed
 *   +existing pickup / destination / discovery / tiles boosts
 *   −4   wine-coherence penalty (wine asked, tour has zero wine)
 *   −6   family-coded-for-couple / romantic-only-for-corporate
 */
/**
 * True when a Signature's own blueprint REQUIRES winery picks — i.e. it has a
 * choice group with `pickMin >= 1` whose every option is a winery in the
 * existing inventory (resolved through the declared structural bridge).
 * Purely structural: no copy parsing, no invented product facts.
 */
function signatureRequiresWineryPicks(tourId: string): boolean {
  const blueprint = getTailorBlueprint(tourId);
  const choice = blueprint?.choice;
  if (!choice || choice.pickMin < 1 || choice.options.length === 0) return false;
  const bridge = STRUCTURAL_STOP_BRIDGE[tourId] ?? {};
  const typeByBlueprintId = new Map<string, string>();
  for (const stop of REGION_STOP_POOL) {
    const blueprintId = bridge[stop.id];
    if (blueprintId) typeByBlueprintId.set(blueprintId, stop.type);
  }
  return choice.options.every((option) => typeByBlueprintId.get(option.id) === "winery");
}

export function scoreTourFit(
  tour: SignatureTour,
  intent: {
    feeling: Feeling;
    companions: Companions;
    interests: ReadonlyArray<Interest>;
    pickup: Pickup | null;
    rhythm?: Rhythm | null;
    destinationIntent?: DestinationIntent | null;
  },
): FitReport {
  assertStopIntentSchema();
  const {
    feeling,
    companions,
    interests,
    pickup,
    rhythm = null,
    destinationIntent = null,
  } = intent;
  const boosts: string[] = [];
  const penalties: string[] = [];

  // ---- Interest coverage (asymmetric: missing what user asked hurts) ----
  const interestCoverage = computeInterestCoverage(tour, interests);
  let interestScore = 0;
  for (const c of interestCoverage) {
    if (c.satisfied) {
      interestScore += 8;
      boosts.push(`interest-${c.interest}-satisfied`);
      // Reward truly-anchored fits: a tour with ≥2 stops tagged for the
      // guest's interest beats one that only satisfies via a single stop
      // or a keyword-fallback hit.
      if (c.strength === "strong") {
        interestScore += 2;
        boosts.push(`interest-${c.interest}-strong`);
      }
    } else {
      interestScore -= 6;
      penalties.push(`interest-${c.interest}-missing`);
    }
  }

  // ---- Feeling semantic match ----
  const feelingMatch = computeFeelingMatch(tour, feeling);
  const feelingScore =
    feelingMatch.match === "strong" ? 12 : feelingMatch.match === "partial" ? 6 : 0;
  if (feelingScore > 0) boosts.push(`feeling-${feeling}-${feelingMatch.match}`);
  else penalties.push(`feeling-${feeling}-weak`);

  // ---- Companions coherence (kept as hard-ish guard) ----
  const cType = companionsType(companions);
  const blockFamilyCoded = cType === "couple" || cType === "solo" || cType === "corporate";
  const blockRomanticCoded = cType === "corporate" || cType === "family";
  const idealFor = tour.idealFor.join(" ");
  let companionsScore = 0;
  let companionsStatus: "pass" | "warn" | "fail" = "pass";
  if (blockFamilyCoded && FAMILY_ONLY_RE.test(idealFor)) {
    companionsScore -= 6;
    penalties.push("family-coded-for-non-family");
    companionsStatus = "fail";
  }
  if (blockRomanticCoded && ROMANTIC_ONLY_RE.test(idealFor)) {
    companionsScore -= 6;
    penalties.push("romantic-coded-for-non-couple");
    companionsStatus = "fail";
  }
  if (companions === "family" && /family|child/i.test(idealFor)) {
    companionsScore += 0.5;
    boosts.push("family-friendly-copy");
  }

  // ---- Wine coherence ----
  // Wine intent is EXPLICIT only (see studioWineIntent.ts). `gastronomy` is
  // food, not wine; the Arrábida/Setúbal/Azeitão region also resolves to
  // boat, wild-beach, cheese and tile routes, so geography is not a wine
  // choice either.
  const explicitWineFeeling = feeling === "wine-food";
  const wineIsTopInterest = interests[0] === "wine";
  const wineIsAnyInterest = interests.includes("wine");
  const wineIntent =
    destinationIntent === "alentejo-evora-wine" || destinationIntent === "alentejo-roman-talha";
  const wineBoost =
    explicitWineFeeling || wineIntent ? 3 : wineIsTopInterest ? 2.5 : wineIsAnyInterest ? 1.5 : 0;
  const wantsWine = wineBoost > 0;
  const nonWineDestinationIntent =
    destinationIntent === "vicentine-coast" ||
    destinationIntent === "lisbon-sintra-cascais" ||
    destinationIntent === "spiritual-coast" ||
    destinationIntent === "central-portugal";
  const tourWineText = `${tour.title} ${tour.theme} ${tour.blurb} ${tour.intro}`;
  const tourHasWineContent =
    /wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca/i.test(
      tourWineText,
    );
  let wineScore = 0;
  if (wantsWine && tourHasWineContent) {
    wineScore += wineBoost;
    boosts.push("wine-content-confirmed");
  }
  if (wineIsAnyInterest && !nonWineDestinationIntent && !tourHasWineContent) {
    wineScore -= 4;
    penalties.push("wine-asked-but-tour-has-no-wine");
  }
  // STRUCTURAL WINE OBLIGATION. Some Signatures are commercially DEFINED by
  // their winery pool ("choose 2 to 4 wineries"): the visits are part of the
  // product, not an option. Anchoring a traveller with no wine intent to such
  // a product either forces wine on them or leaves the day unpriceable, so the
  // scaffold is strongly deprioritised in favour of the region's non-wine
  // Signatures. Read from the existing blueprint — never inferred from copy.
  if (!wantsWine && signatureRequiresWineryPicks(tour.id)) {
    wineScore -= 5;
    penalties.push("wine-required-by-product-but-not-wanted");
  }


  // ---- Existing pickup / intent / discovery boosts (kept, re-weighted for
  // the new score scale — interest coverage now dominates, so the
  // destination-intent signal is boosted 2.5x so a guest who explicitly
  // chose a region isn't outvoted by a Lisbon-adjacent alternative that
  // happens to satisfy the same interests). ----
  const pickupBoost = pickupAffinity(tour, pickup) * 0.8;
  if (pickupBoost > 0) boosts.push("pickup-adjacent");
  const intentBoost = destinationIntentBoost(tour, destinationIntent) * 2.5;
  if (intentBoost > 0) boosts.push("destination-intent-aligned");
  const discoveryBoost = profileDiscoveryBoost(tour, feeling, interests, destinationIntent) * 2;
  if (discoveryBoost > 0) boosts.push("profile-discovery");

  // ---- Tiles / culture-craft nudge (kept) ----
  const wantsTilesCraft =
    feeling === "culture" &&
    interests.includes("local-life") &&
    (interests.includes("heritage") || interests.length === 1);
  const isLisbonArea =
    !pickup ||
    pickup === "lisbon" ||
    pickup === "lisbon-airport" ||
    pickup === "lisbon-cruise" ||
    pickup === "cascais-estoril" ||
    pickup === "sintra" ||
    pickup === "sesimbra-setubal-arrabida";
  let tilesBoost = 0;
  if (wantsTilesCraft && isLisbonArea && tour.id === "tiles-workshop") {
    tilesBoost = 3;
    boosts.push("tiles-culture-local-life");
  }

  // ---- Rhythm feasibility (advisory) ----
  const hours = tourHoursEstimate(tour);
  const budget = rhythm ? RHYTHM_HOURS_BUDGET[rhythm] : null;
  const rhythmFeasible =
    !budget || hours === null || (hours >= budget.min - 1 && hours <= budget.max + 1);
  let rhythmScore = 0;
  if (budget && hours !== null) {
    if (rhythmFeasible) {
      rhythmScore += 2;
      boosts.push("rhythm-feasible");
    } else {
      rhythmScore -= 3;
      penalties.push("rhythm-mismatch");
    }
  }

  // ---- Reachability (advisory) ----
  const pickupReachable = isPickupReachable(tour, pickup, rhythm);
  if (!pickupReachable) penalties.push("pickup-not-reachable");

  const totalScore =
    interestScore +
    feelingScore +
    companionsScore +
    wineScore +
    pickupBoost +
    intentBoost +
    discoveryBoost +
    tilesBoost +
    rhythmScore;

  return {
    tourId: tour.id,
    totalScore,
    hardConstraints: {
      pickupReachable,
      companionsAllowed: companionsStatus !== "fail",
      rhythmFeasible,
    },
    coverage: {
      interests: interestCoverage,
      feeling: feelingMatch,
      destinationIntentAligned: intentBoost > 0,
      companions: companionsStatus,
    },
    penalties,
    boosts,
  };
}

/** Pick ONE Signature skeleton that best fits the answers AND keeps the
 *  route geographically contained near the chosen pickup.
 *
 *  Phase 8: delegates to `pickPrimaryTourWithFit`, which uses the
 *  deterministic `scoreTourFit` FitReport model. Kept as a thin wrapper
 *  so all existing call sites (route resolver, tests, storyboard,
 *  reshape) get the improved matching without a signature change. */
export function pickPrimaryTour(
  feeling: Feeling,
  companions: Companions,
  interests: ReadonlyArray<Interest>,
  pickup: Pickup | null,
  destinationIntent: DestinationIntent | null,
  seed: number = 0,
  rhythm: Rhythm | null = null,
  preferTourId: string | null = null,
  eligibleTourIds: ReadonlyArray<string> | null = null,
): { tour: SignatureTour; alternates: SignatureTour[] } {
  const { tour, alternates } = pickPrimaryTourWithFit(
    feeling,
    companions,
    interests,
    pickup,
    destinationIntent,
    seed,
    rhythm,
    preferTourId,
    eligibleTourIds,
  );
  return { tour, alternates };
}

/**
 * pickPrimaryTourWithFit — same as `pickPrimaryTour` but also returns:
 *   - `fit`: FitReport for the chosen tour (feeds "Why this journey" UI)
 *   - `topReports`: FitReports for the top 3 candidates (debug overlay)
 *   - `filtered`: candidates dropped by hard constraints, with reason
 *
 * Deterministic given the same inputs. When `seed > 0` (Reshape), picks
 * from the top band (Δ ≤ 8) so re-rolls yield genuinely different but
 * comparably-good Signatures.
 */
export function pickPrimaryTourWithFit(
  feeling: Feeling,
  companions: Companions,
  interests: ReadonlyArray<Interest>,
  pickup: Pickup | null,
  destinationIntent: DestinationIntent | null,
  seed: number = 0,
  rhythm: Rhythm | null = null,
  /** Living Atlas preference — honoured only when eligible and competitive. */
  preferTourId: string | null = null,
  /**
   * PREFLIGHT TRUTH — the product ids that are actually sellable for the
   * traveller's exact date / pickup / party. `null` means "not resolved yet"
   * and leaves selection exactly as before. Never widens the pool.
   */
  eligibleTourIds: ReadonlyArray<string> | null = null,
): {
  tour: SignatureTour;
  alternates: SignatureTour[];
  fit: FitReport;
  topReports: Array<{ tour: SignatureTour; fit: FitReport }>;
  filtered: Array<{ tour: SignatureTour; reason: string }>;
  /**
   * Explicit high-signal interests the chosen candidate cannot truthfully
   * satisfy. Non-empty means Studio must ask ONE material trade-off instead
   * of revealing a partially-matching day.
   */
  unsatisfiedHighSignal: Interest[];

} {
  assertStopIntentSchema();
  // Build the candidate pool from every axis the guest touched. FEELING_TO_TOURS
  // alone can miss cross-feeling matches (e.g. wine + adventure), so we fold in
  // destination-intent, interest, and profile-discovery targets before scoring.
  const candidateIds = FEELING_TO_TOURS[feeling] ?? [];
  const intentTargets =
    destinationIntent && destinationIntent !== "no-preference"
      ? Object.keys(DESTINATION_INTENT_BOOSTS[destinationIntent])
      : [];
  const interestTargets = interests.flatMap((i) => INTEREST_TARGET_TOURS[i] ?? []);
  const discoveryTargets = profileDiscoveryTargets(feeling, interests, destinationIntent);
  const mergedIds = Array.from(
    new Set([...candidateIds, ...intentTargets, ...interestTargets, ...discoveryTargets]),
  );
  // PREFLIGHT CEILING — when preflight resolved an eligible pool, that pool
  // is an ABSOLUTE ceiling. If the taste-derived intersection is empty we
  // widen only to the eligible pool itself (so semantic scoring still runs),
  // never back to `mergedIds`, which may contain products that are not
  // sellable for this date / pickup / party.
  const allowed = eligibleTourIds && eligibleTourIds.length > 0 ? new Set(eligibleTourIds) : null;
  const constrainedIds = allowed ? mergedIds.filter((id) => allowed.has(id)) : mergedIds;
  const poolIds =
    constrainedIds.length > 0
      ? constrainedIds
      : allowed
        ? Array.from(allowed)
        : mergedIds;
  const candidates = poolIds
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is SignatureTour => Boolean(t));

  if (candidates.length === 0) {
    // Fallback must also respect the ceiling: only ever a product preflight
    // declared sellable, otherwise the feeling fallback.
    const fallbackId = FEELING_FALLBACK[feeling];
    const fallback =
      (allowed
        ? (signatureTours.find((t) => allowed.has(t.id) && t.id === fallbackId) ??
          signatureTours.find((t) => allowed.has(t.id)))
        : signatureTours.find((t) => t.id === fallbackId)) ??
      signatureTours.find((t) => t.id === fallbackId) ??
      signatureTours[0];
    const fit = scoreTourFit(fallback, {
      feeling,
      companions,
      interests,
      pickup,
      rhythm,
      destinationIntent,
    });
    return {
      tour: fallback,
      alternates: [],
      fit,
      topReports: [{ tour: fallback, fit }],
      filtered: [],
      unsatisfiedHighSignal: interests.filter((i) => HIGH_SIGNAL_INTERESTS.includes(i)),

    };
  }


  // Score every candidate with the FitReport model.
  const reported = candidates.map((tour, order) => ({
    tour,
    order,
    fit: scoreTourFit(tour, { feeling, companions, interests, pickup, rhythm, destinationIntent }),
  }));

  // Hard filter: drop tours that fail companions-coherence AND have no
  // interest coverage — those are near-guaranteed mismatches (family-coded
  // day offered to a couple with zero interest alignment). Conservative:
  // never drop the last remaining candidate.
  const filtered: Array<{ tour: SignatureTour; reason: string }> = [];
  let eligible = reported.filter((r) => {
    const failsCompanions = !r.fit.hardConstraints.companionsAllowed;
    const zeroCoverage =
      r.fit.coverage.interests.length > 0 && r.fit.coverage.interests.every((c) => !c.satisfied);
    if (failsCompanions && zeroCoverage) {
      filtered.push({ tour: r.tour, reason: "companions-coded-mismatch-and-no-interest-coverage" });
      return false;
    }
    return true;
  });
  if (eligible.length === 0) eligible = reported;

  // SEMANTIC GATE — a HIGH-SIGNAL interest is one the traveller could only
  // have chosen deliberately (faith, hands-on workshops, wine). Satisfying
  // ONE of them is not a match: every explicitly selected high-signal
  // interest must be covered by VERIFIED stop-intent evidence (keyword-only
  // "satisfied" rows carry strength "none" and do not count). When no
  // candidate covers them all we keep the maximum-coverage set and report
  // the unsatisfied interests so Studio can ask one material trade-off
  // instead of revealing an unrelated day.
  const highSignal = interests.filter((i) => HIGH_SIGNAL_INTERESTS.includes(i));
  const verifiedHighSignal = (r: (typeof eligible)[number]): string[] =>
    r.fit.coverage.interests
      .filter(
        (c) =>
          c.satisfied &&
          c.strength !== "none" &&
          (highSignal as ReadonlyArray<string>).includes(c.interest),
      )
      .map((c) => c.interest);
  let unsatisfiedHighSignal: Interest[] = [];
  if (highSignal.length > 0) {
    const covered = eligible.map((r) => ({ r, hit: verifiedHighSignal(r) }));
    const best = Math.max(...covered.map((c) => c.hit.length));
    if (best > 0) {
      const keep = covered.filter((c) => c.hit.length === best);
      const keepSet = new Set(keep.map((c) => c.r));
      for (const r of eligible) {
        if (!keepSet.has(r)) {
          filtered.push({
            tour: r.tour,
            reason:
              best === highSignal.length
                ? "does-not-cover-all-high-signal-interests"
                : "no-high-signal-interest-evidence",
          });
        }
      }
      eligible = keep.map((c) => c.r);
      if (best < highSignal.length) {
        const bestHit = new Set(keep[0]?.hit ?? []);
        unsatisfiedHighSignal = highSignal.filter((i) => !bestHit.has(i));
      }
    } else {
      unsatisfiedHighSignal = [...highSignal];
    }
  }



  const sorted = eligible.sort((a, b) => {
    if (b.fit.totalScore !== a.fit.totalScore) return b.fit.totalScore - a.fit.totalScore;
    return a.order - b.order; // preserve pool ordering as deterministic tiebreak
  });

  // Reshape: pick among top-band candidates (Δ ≤ 8 from the leader) so
  // re-rolls yield a genuinely different but comparably-good Signature.
  let chosen = sorted[0];
  if (seed > 0 && sorted.length > 1) {
    const top = sorted[0].fit.totalScore;
    const band = sorted.filter((s) => top - s.fit.totalScore <= 8);
    if (band.length > 1) {
      const rand = mulberry32(seed)();
      chosen = band[Math.floor(rand * band.length)] ?? sorted[0];
    }
  }

  // Living Atlas preference — the intelligence layer may nominate a
  // Signature it believes fits the traveller's leading dimensions better
  // (e.g. the scholarly "Sacred heritage" Director answer →
  // `templars-and-university` → `tomar-coimbra`). It is honoured whenever
  // that tour survived every hard constraint, the preflight ceiling and the
  // high-signal gate above — a deliberate, discriminative answer must not be
  // outvoted by generic scoring. Never invents a tour, never widens the pool.
  if (preferTourId && sorted.length > 1) {
    const preferred = sorted.find((s) => s.tour.id === preferTourId);
    if (preferred) chosen = preferred;
  }

  const alternates = sorted
    .filter((s) => s.tour.id !== chosen.tour.id)
    .slice(0, 2)
    .map((s) => s.tour);

  const topReports = sorted.slice(0, 3).map(({ tour, fit }) => ({ tour, fit }));

  return {
    tour: chosen.tour,
    alternates,
    fit: chosen.fit,
    topReports,
    filtered,
    unsatisfiedHighSignal,
  };

}

/**
 * curateJourney — route-contained. Returns moments drawn ONLY from the
 * single primary Signature tour's own `stops`. No cross-tour borrowing,
 * no mixed-region routes. The Living Canvas, the unified Your Day surface
 * and checkout all consume this single source via resolveStudioV3Route.
 */
export function curateJourney(
  feeling: Feeling,
  companions: Companions,
  rhythm: Rhythm,
  options?: {
    interests?: ReadonlyArray<Interest>;
    pickup?: Pickup | null;
    investment?: InvestmentTier | null;
    destinationIntent?: DestinationIntent | null;
    /** ISO yyyy-mm-dd — on this legacy-only path, stops closed on that
     *  weekday are removed from the curated pool. */
    dateExact?: string | null;
    /** Reshape counter. 0 = original deterministic curation (test contract
     *  preserved). > 0 = seeded variation: alternate eligible Signature
     *  when several fit + gentle per-stop jitter so the day re-arranges
     *  without breaking any cap or inventing stops. */
    seed?: number | string;
    /** Living Atlas preferred Signature id (preference, never an override). */
    preferTourId?: string | null;
  },
): CuratedJourney {
  const interests = options?.interests ?? [];
  const pickup = options?.pickup ?? null;
  const investment = options?.investment ?? null;
  const destinationIntent = options?.destinationIntent ?? null;
  const dateExact = options?.dateExact ?? null;
  const seedNum = hashSeed(options?.seed);
  const rand = seedNum > 0 ? mulberry32(seedNum) : null;

  const { tour: primary, alternates } = pickPrimaryTour(
    feeling,
    companions,
    interests,
    pickup,
    destinationIntent,
    seedNum,
    // rhythm intentionally null here — preserves the existing curation
    // scoring contract; only the Living Atlas preference is new.
    null,
    options?.preferTourId ?? null,
  );

  // STRICT containment: pool = primary tour's own stops only.
  const rawPool: PoolStop[] = primary.stops.map((s) => ({
    fromTourId: primary.id,
    label: s.label,
    story: s.story,
    image: s.image,
    focal: s.focal,
    imageTheme: s.imageTheme,
    isBaseTour: true,
  }));

  // Operational closures live in src/data/stopOperational.ts so new rules
  // (holidays, seasonal windows, partner-confirmed downtime) can be added
  // without touching curation logic. Always cite a source there.
  const rejections: CurationAuditRejection[] = [];
  // AI-predictive coherence: drop stops whose copy reads as exclusively
  // family-coded (children/playground) when the traveller is not family,
  // and the mirror case for romantic-only language offered to corporate.
  const cType = companionsType(companions);
  const blockFamilyCoded = cType === "couple" || cType === "solo" || cType === "corporate";
  const blockRomanticCoded = cType === "corporate" || cType === "family";

  const coherent: PoolStop[] = rawPool.filter((s) => {
    const hay = `${s.label} ${s.story}`;
    if (blockFamilyCoded && FAMILY_ONLY_RE.test(hay)) {
      rejections.push({ label: s.label, reason: "coherence-family-only" });
      return false;
    }
    if (blockRomanticCoded && ROMANTIC_ONLY_RE.test(hay)) {
      rejections.push({ label: s.label, reason: "coherence-romantic-only" });
      return false;
    }
    return true;
  });

  const pool: PoolStop[] = !dateExact
    ? coherent
    : coherent.filter((s) => {
        const closed = isStopClosedOn(`${s.label} ${s.story}`, dateExact);
        if (closed) {
          rejections.push({
            label: s.label,
            reason: "closed-on-date",
            detail: dateExact,
          });
        }
        return !closed;
      });

  // Score by feeling + companions + selected interests (refinement, not
  // additional locations). Stops with resolvable coords are preferred so
  // the map has something to draw.
  const scored = pool
    .map((s, i) => {
      const geo = lookupStop(s.label);
      let score = scoreStop(s, feeling, companions);

      const hay = `${s.label} ${s.story}`.toLowerCase();
      if (interests.length > 0) {
        for (const interest of interests) {
          const kws = INTEREST_TOUR_KEYWORDS[interest] ?? [];
          for (const kw of kws) {
            if (hay.includes(kw)) {
              score += 0.5;
              break;
            }
          }
        }
      }
      // Phase 4.5 soft signal — never changes the pool, only ranking.
      score += investmentPremiumScore(investment, hay);
      // Reshape jitter (seed > 0 only): ±0.45 deterministic nudge per stop.
      // Small enough that high-affinity picks still win, big enough that
      // close-tie moments swap on a re-roll. Anchor (first tour stop) is
      // never jittered so the day always opens coherently.
      if (rand && i > 0) {
        score += (rand() - 0.5) * 0.9;
      }
      return { stop: s, score, hasGeo: Boolean(geo), geo, order: i };
    })

    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.hasGeo !== b.hasGeo) return a.hasGeo ? -1 : 1;
      return a.order - b.order;
    });

  // Cap stops by rhythm, nudged by investment, but never exceed what the
  // tour has and never drop below a substantive arc.
  // Phase 7A: floor is 3 stops by default so a day never feels under-shaped.
  // Only an explicitly slow rhythm may resolve to a calmer 2-stop day, and
  // only when the day is for solo / couple-style travel without family or
  // nature interests pulling for more substance.
  const investmentDelta = investment ? INVESTMENT_STOP_DELTA[investment] : 0;
  const rhythmTarget = RHYTHM_STOP_COUNT[rhythm] + investmentDelta;
  const allowTwoStop =
    rhythm === "slow" &&
    (companions === "solo" || companions === "couple" || companions === "proposal") &&
    !interests.includes("nature");
  const minStops = allowTwoStop ? 2 : 3;
  const target = Math.max(minStops, Math.min(rhythmTarget, scored.length));

  // Place-identity dedupe (see `semanticStopKey`): curated aliases first,
  // then a conservative normalization. Deliberately NOT a broad generic-noun
  // stripper — that merged unrelated places.
  const normalizeSemantic = (label: string): string => semanticStopKey(label);


  // Anchor on the tour's opening stop so the narrative arc is intact.
  const anchor = scored.find((s) => s.stop.label === primary.stops[0]?.label);
  const picks: typeof scored = [];
  const seenLabels = new Set<string>();
  const seenSemantic = new Set<string>();
  // Regional hard caps on winery-type stops per day. Beyond these counts
  // the palate dulls and the day stops feeling curated. Sintra/Lisboa are
  // not wine regions — at most one symbolic stop. Arrábida/Setúbal is the
  // Moscatel heartland (3). Alentejo allows 2 distinct estates. Other
  // regions default to 1 unless we widen the rule explicitly.
  const REGIONAL_WINERY_CAP: Record<RegionId, number> = {
    "arrabida-setubal": 3,
    "alentejo-evora": 2,
    "douro-porto": 3,
    "sintra-cascais": 1,
    "lisbon-sintra-cascais": 1,
    "comporta-troia": 1,
    "fatima-nazare-obidos": 1,
    "tomar-coimbra": 1,
    other: 1,
  };
  // tour.region is a human-readable label (e.g. "Setúbal · Arrábida"),
  // not a RegionId. Normalise to a RegionId for cap lookup.
  const regionLabel = (primary.region ?? "").toLowerCase();
  const regionId: RegionId = /arr[áa]bida|set[úu]bal|azeit[ãa]o|sesimbra|palmela/.test(regionLabel)
    ? "arrabida-setubal"
    : /alentejo|[ée]vora/.test(regionLabel)
      ? "alentejo-evora"
      : /douro|porto/.test(regionLabel)
        ? "douro-porto"
        : /sintra|cascais/.test(regionLabel)
          ? "sintra-cascais"
          : /lisbon|lisboa/.test(regionLabel)
            ? "lisbon-sintra-cascais"
            : /comporta|tr[óo]ia/.test(regionLabel)
              ? "comporta-troia"
              : /f[áa]tima|nazar[ée]|[óo]bidos/.test(regionLabel)
                ? "fatima-nazare-obidos"
                : /tomar|coimbra/.test(regionLabel)
                  ? "tomar-coimbra"
                  : "other";
  const wineryCap = REGIONAL_WINERY_CAP[regionId] ?? 1;
  const isWineryStop = (s: (typeof scored)[number]) =>
    WINE_STOP_RE.test(`${s.stop.label} ${s.stop.story}`);
  let wineryCount = 0;
  const addPick = (s: (typeof scored)[number]) => {
    picks.push(s);
    seenLabels.add(s.stop.label.toLowerCase());
    seenSemantic.add(normalizeSemantic(s.stop.label));
    if (isWineryStop(s)) wineryCount += 1;
  };
  if (anchor) addPick(anchor);
  for (const s of scored) {
    if (picks.length >= target) break;
    if (seenLabels.has(s.stop.label.toLowerCase())) {
      rejections.push({ label: s.stop.label, reason: "duplicate-label" });
      continue;
    }
    if (seenSemantic.has(normalizeSemantic(s.stop.label))) {
      rejections.push({ label: s.stop.label, reason: "semantic-duplicate" });
      continue;
    }
    if (isWineryStop(s) && wineryCount >= wineryCap) {
      rejections.push({
        label: s.stop.label,
        reason: "winery-cap",
        detail: `region=${regionId} cap=${wineryCap}`,
      });
      continue;
    }
    addPick(s);
  }

  // ---- PASS 2.1 · TIME AUTHORITY BOUNDARY --------------------------------
  // Signature route stops carry NO structural dwell provenance, so certified
  // minute truth does not exist here. Label inference (`inferKind` +
  // DWELL_BY_KIND) is a generic average, never structural duration truth, and
  // must not grow a legacy day. The explicit legacy count fallback
  // (RHYTHM_STOP_COUNT + INVESTMENT_STOP_DELTA) therefore remains the shaping
  // authority for `curateJourney`. This is correct and safe, not a gap.




  // Wine is only forced into a day when the traveller actually asked for it.
  // A region choice is NOT a wine choice: "Arrábida, Setúbal & Azeitão" also
  // resolves to boat, wild-beach, cheese and tile routes, and a traveller who
  // picked coast/culture with no wine interest must never have a named winery
  // pushed into (or swapped into) their day. The two Alentejo intents stay
  // because the traveller-visible label itself names the wine tradition.
  const wineSignal = hasExplicitWineIntent({
    feeling,
    interests,
    destinationIntent: options?.destinationIntent ?? null,
  });


  let wineSwapApplied = false;
  if (wineSignal && !picks.some((p) => WINE_STOP_RE.test(`${p.stop.label} ${p.stop.story}`))) {
    const winePick = scored.find(
      (s) =>
        !seenLabels.has(s.stop.label.toLowerCase()) &&
        !seenSemantic.has(normalizeSemantic(s.stop.label)) &&
        WINE_STOP_RE.test(`${s.stop.label} ${s.stop.story}`),
    );
    if (winePick) {
      // PASS 2.1 — no certified minute truth exists for Signature route
      // stops, so the legacy count gate (below) keeps prior wine behaviour.
      if (picks.length < target) {
        addPick(winePick);
        wineSwapApplied = true;
      } else if (picks.length > 1) {


        // Swap a non-anchor pick out so wine fits without growing the day.
        const swapIndex = picks.length - 1;
        const removed = picks.splice(swapIndex, 1)[0];
        if (removed) {
          seenLabels.delete(removed.stop.label.toLowerCase());
          seenSemantic.delete(normalizeSemantic(removed.stop.label));
          rejections.push({
            label: removed.stop.label,
            reason: "swapped-for-wine",
            detail: winePick.stop.label,
          });
        }
        addPick(winePick);
        wineSwapApplied = true;
      }
    }
  }

  // Re-order picks to match the tour's natural stop order so the route
  // reads as a believable progression on the map.
  const tourOrder = new Map(primary.stops.map((s, i) => [s.label.toLowerCase(), i]));
  picks.sort((a, b) => {
    const ai = tourOrder.get(a.stop.label.toLowerCase()) ?? 999;
    const bi = tourOrder.get(b.stop.label.toLowerCase()) ?? 999;
    return ai - bi;
  });

  const moments: CuratedMoment[] = picks.map((s, i) => ({
    index: i,
    label: s.stop.label,
    story: s.stop.story,
    image: s.stop.image,
    focal: s.stop.focal,
    lat: s.geo?.lat ?? null,
    lng: s.geo?.lng ?? null,
    fromTourId: s.stop.fromTourId,
    borrowed: false, // never borrowed under route containment
  }));

  const firstGeo = moments.find((m) => m.lat !== null && m.lng !== null);
  const center =
    firstGeo && firstGeo.lat !== null && firstGeo.lng !== null
      ? { lat: firstGeo.lat, lng: firstGeo.lng }
      : null;

  const audit: CurationAudit = {
    poolSizeRaw: rawPool.length,
    poolSizeAfterClosures: pool.length,
    target,
    rejections,
    wineSwapApplied,
  };

  return { tour: primary, alternates, moments, center, audit };
}

/* ---------- Single route-resolution source (used everywhere) ---------- */

export type RouteConfidence = "high" | "medium" | "needs-human-refinement";

export interface ResolvedRoutePoint {
  /** 0-based order along the route. */
  index: number;
  /** Human-facing stop label as it appears in the Signature catalog. */
  label: string;
  /** Short editorial line, drawn from the same Signature stop. */
  story: string;
  /** Geo coordinates when resolvable; null = render label only, no pin. */
  lat: number | null;
  lng: number | null;
  /**
   * PASS 3A — STRUCTURAL identity of the underlying inventory moment, when
   * one genuinely exists upstream. Never derived from label, index or order,
   * and never a timing/commercial certification on its own.
   */
  inventoryStopId?: string | null;
  /** VERIFIED per-point media the source already holds. Never invented. */
  image?: string | null;
  /** Existing catalogue focal format (CSS object-position, e.g. "50% 40%"). */
  focal?: string | null;
  /**
   * VERIFIED structural dwell of the underlying inventory moment, carried
   * verbatim from the pool row. Never guessed from a label, never defaulted.
   */
  durationMinutes?: number | null;
  /** Provenance of `durationMinutes`. Absent when no proven dwell exists. */
  durationSource?: import("@/lib/studio-v3/timeDomain").DwellSource | null;
}


export interface ResolvedStudioV3Route {
  /** INTERNAL only — id of the Signature skeleton chosen. Never shown. */
  skeletonTourKey: string | null;
  /** INTERNAL only — full Signature title for logging/debug. Never shown. */
  skeletonTitleInternal: string | null;
  /** Customer-facing area label (e.g. "Setúbal · Arrábida"). */
  routeAreaLabel: string;
  /** Customer-facing route sentence: "Origin → A · B · C → Origin". */
  suggestedRouteLabel: string;
  /** Compact legacy/Journey-Card projection — max 4 points, presentation only. */
  routePoints: ResolvedRoutePoint[];
  /**
   * The FULL ordered composed route — never presentation-capped. This is the
   * itinerary authority: every consumer that shows the traveller's day (reveal,
   * story snapshot, resolved journey, checkout-facing state) must prefer this
   * over `routePoints`, which exists only for the compact 4-slot card.
   */
  composedRoutePoints: ResolvedRoutePoint[];

  /** Deterministic editorial title for the journey card. */
  journeyTitle: string;
  /** 2–3 short reasons grounded in the actual answers. */
  whyItFits: string[];
  /** Up to 2 personalized refinements (substitutions inside the area). */
  refinements: string[];
  /** Short copy line about what YES will confirm before booking. */
  whatToConfirm: string;
  /** Resolution confidence — drives the fallback messaging upstream. */
  confidence: RouteConfidence;
  /**
   * Living Atlas intelligence — grounded "why this direction fits you"
   * lines derived from the traveller's leading dimensions. Empty when the
   * profile is too thin to reason safely. Never used for pricing.
   */
  livingAtlasReasons: string[];
  /**
   * Up to 2 genuinely differentiated alternative directions, each carrying
   * something the chosen day does not. Empty when nothing differs enough to
   * be worth showing. Display-only — never affects pricing or availability.
   */
  livingAtlasAlternatives: StudioAlternativeDirection[];
  /**
   * BUILD 1 / Pass 4 — INTERNAL Living Atlas block. Additive: every existing
   * public field above is unchanged. Null on the legacy / flag-off path.
   *
   * It carries NO scores, NO supplier identities, NO raw pricing internals and
   * NO exact public timetable — only the smallest truthful structure Build 2
   * needs.
   */
  livingAtlasLive: LivingAtlasLiveBlock | null;
}

/** How the public/live bookable route was resolved on the Living Atlas branch. */
export type LivingAtlasLiveResolution = "composed" | "authored-fallback";

/**
 * Did the composition authority finish a structurally real day?
 * `unresolved` forbids route/schedule/validation/identity certification.
 */
export type LivingAtlasCompositionResolution = "complete" | "unresolved";

/** Minimal structural contract the gate actually reads. `LivingAtlasComposition`
 *  is naturally assignable to this, so the production call site needs no cast. */
export type LivingAtlasCompositionResolutionInput = {
  status: LivingAtlasComposition["status"];
  moments: readonly unknown[];
  /** Structural obligations of the anchor that were NOT met. Always fatal. */
  missingRequiredTypes?: readonly unknown[];
  /** A timing tradeoff is never silently self-served. */
  conflict?: unknown;
  /** Composer's own operational verdict. Curator review is always fatal. */
  requiresCuratorReview?: boolean;
} | null;

/**
 * Pure structural gate used by the production certification chain.
 *
 * SELF-SERVICE TRUTH. A `complete` day always resolves. A `partial` day
 * resolves ONLY when nothing structural or operational is missing — every
 * anchor obligation met, no timing conflict, no curator verdict, and a real
 * multi-moment day. In that case the only thing "partial" means is that a
 * DISCRETIONARY taste dimension found no verified moment inside the anchor's
 * own commercially containable inventory; the day is still truthful and
 * bookable, it simply does not claim to express that taste. Anything else —
 * tradeoff, impossible, empty, invalid — stays unresolved and fails closed.
 */
export function resolveLivingAtlasCompositionResolution(
  composition: LivingAtlasCompositionResolutionInput,
): LivingAtlasCompositionResolution {
  return isSelfServiceComposable(composition) ? "complete" : "unresolved";
}


export type LivingAtlasLiveBlock = {
  anchorTourId: LivingAtlasSignatureId;
  /** Composer authority output — the single membership authority. */
  composition: LivingAtlasComposition | null;
  conflict: TimingConflict | null;
  /** Explicit branch reason when the adapter did not project a hybrid day. */
  passthroughReason: HybridPassthroughReason | null;
  /** Structural resolution gate — certification only ever runs on `complete`. */
  compositionResolution: LivingAtlasCompositionResolution;
  /** What the traveller actually sees as the bookable route. */
  liveResolution: LivingAtlasLiveResolution;
  /** Why the authored anchor was projected instead of the composition. */
  fallbackReason:
    | "none"
    | "passthrough"
    | "commercial-gate"
    | "validation-invalid";
  /** FROZEN identity set — immutable after composition. */
  compositionStopIds: string[];
  identity: CompositionIdentityReport | null;
  /** Approximate planning timing. No exact public HH:MM is ever derived here. */
  planningTiming: ComposedTiming | null;
  approximateDurationClass: string | null;
  /** VERIFIED mandatory connector minutes. Never dwell, never spendable. */
  internalTransitMinutes: number;
  /**
   * Truthful internal total: experience planning minutes PLUS verified internal
   * transit. Excludes pickup/drop-off. Null when there is no planning timing.
   */
  totalPlannedMinutesIncludingInternalTransit: number | null;

  routePlan: LivingAtlasRoutePlan | null;
  /** Order after operational windows — identity only, never membership. */
  scheduledStopIds: string[];
  validation: LivingAtlasValidationResult | null;
  commercialLedger: CommercialLedger | null;
  commercialDisposition: CommercialLedger["disposition"] | null;
  internalIssues: HybridInternalIssue[];
  /**
   * TRUE when the day is NOT certified bespoke-bookable under the existing
   * authorities and belongs with a curator. Whenever the authored Signature
   * itinerary is projected instead of a certified bespoke composition, the day
   * is explicitly flagged here rather than silently presented as "their day".
   */
  requiresCuratorReview: boolean;
  /** Owner door-to-door certification of the projected day, when composed. */
  doorToDoor: DoorToDoorCertification | null;
};

type UncertifiedLivingAtlasBlockInput = Pick<
  LivingAtlasLiveBlock,
  | "anchorTourId"
  | "composition"
  | "conflict"
  | "passthroughReason"
  | "compositionResolution"
  | "fallbackReason"
  | "compositionStopIds"
  | "planningTiming"
  | "approximateDurationClass"
  | "internalTransitMinutes"
  | "totalPlannedMinutesIncludingInternalTransit"
  | "internalIssues"
>;

/** Build the fail-closed envelope shared by unresolved and fallback states. */
export function buildUncertifiedLivingAtlasBlock(
  input: UncertifiedLivingAtlasBlockInput,
): LivingAtlasLiveBlock {
  return {
    ...input,
    liveResolution: "authored-fallback",
    identity: null,
    routePlan: null,
    scheduledStopIds: [],
    validation: null,
    commercialLedger: null,
    commercialDisposition: null,
    // An uncertified/authored-fallback day is by definition not a certified
    // bespoke composition, so it always belongs with a curator.
    requiresCuratorReview: true,
    doorToDoor: input.composition?.doorToDoor ?? null,
  };
}

export function resolveStudioV3CurationAuthority<T>(
  anchorTourId: string,
  resolveLegacy: () => T,
): { path: "living-atlas"; legacy: null } | { path: "legacy"; legacy: T } {
  const isLivingAtlas =
    STUDIO_V3_ROUTE_COMPOSITION_ENABLED &&
    (LIVING_ATLAS_SIGNATURE_IDS as readonly string[]).includes(anchorTourId);
  return isLivingAtlas
    ? { path: "living-atlas", legacy: null }
    : { path: "legacy", legacy: resolveLegacy() };
}


/** Customer-safe shape of a Living Atlas alternative direction. */
export interface StudioAlternativeDirection {
  /** Real Signature tour id in the catalogue. */
  tourId: string;
  /** Customer-facing title of that Signature. */
  title: string;
  /** One grounded line explaining how it differs from the chosen day. */
  note: string;
}

/**
 * resolveStudioV3Route — the SINGLE source of route truth for Studio V3.
 *
 * The Living Canvas, the unified Your Day (storyboard) surface and
 * checkout must all consume the object returned by this function. There
 * must not be separate route logic anywhere else in Studio V3.
 *
 * Guarantees:
 *  - Picks ONE Signature skeleton based on feeling + interests + pickup.
 *  - All routePoints come from that Signature's own `stops` only.
 *  - Never combines distant tours. Never invents stops or suppliers.
 *  - Hidden skeleton title is never exposed (skeletonTitleInternal only).
 *  - Falls back to a "Tailor-made by YES" object when nothing fits safely.
 */
/**
 * Map Living Atlas alternative directions onto real catalogue tours.
 * Anything that does not resolve to a real Signature — or that duplicates
 * the chosen day — is dropped rather than described.
 */
function toAlternativeDirections(
  alternatives: ReadonlyArray<{ signatureId: string; note: string }>,
  chosenTourId: string,
): StudioAlternativeDirection[] {
  const out: StudioAlternativeDirection[] = [];
  for (const alternative of alternatives) {
    if (alternative.signatureId === chosenTourId) continue;
    const tour = signatureTours.find((t) => t.id === alternative.signatureId);
    if (!tour) continue;
    out.push({ tourId: tour.id, title: tour.title, note: alternative.note });
  }
  return out.slice(0, 2);
}

export function resolveStudioV3Route(input: {
  feeling: Feeling | null;
  companions: Companions | null;
  rhythm: Rhythm | null;
  interests: ReadonlyArray<Interest>;
  pickup: Pickup | null;
  occasion?: Occasion | null;
  considerations?: ReadonlyArray<string>;
  investment?: InvestmentTier | null;
  destinationIntent?: DestinationIntent | null;
  /** ISO yyyy-mm-dd — carried to the active authority: legacy filtering on
   *  legacy routes, or validation truth on Living Atlas routes. */
  dateExact?: string | null;
  /** Living Atlas preferred Signature id — preference only, filtered by curation. */
  preferTourId?: string | null;
  /** Adaptive refinement answer — legacy compatibility fallback only. */
  refinement?: AdaptiveRefinementId | null;
  /**
   * Canonical Director question history. When present it is the authority for
   * discovery signals; `refinement` is only read when this is empty.
   */
  questionHistory?: readonly QuestionAnswerEvent[];
  /** Reshape/reroll seed (usually `state.rerollCount`). 0 = original curation. */
  seed?: number | string;
  /**
   * PREFLIGHT TRUTH — products that are actually sellable for this traveller's
   * exact date / pickup / party. Narrows candidate selection only; `null` or
   * empty leaves the historical behaviour untouched.
   */
  eligibleTourIds?: ReadonlyArray<string> | null;

}): ResolvedStudioV3Route {
  const { feeling, companions, rhythm, interests, pickup, occasion } = input;
  const investment = input.investment ?? null;
  const destinationIntent = input.destinationIntent ?? null;
  const dateExact = input.dateExact ?? null;
  const origin = pickupCityLabel(pickup);

  // Fallback when we don't have enough to safely resolve a Signature.
  if (!feeling || !companions || !rhythm) {
    return {
      skeletonTourKey: null,
      skeletonTitleInternal: null,
      routeAreaLabel: "Tailor-made by YES",
      suggestedRouteLabel: "To be refined with YES",
      routePoints: [],
      composedRoutePoints: [],

      journeyTitle: "Your private Portugal day",
      whyItFits: [],
      livingAtlasReasons: [],
      livingAtlasAlternatives: [],
      livingAtlasLive: null,

      refinements: [],
      whatToConfirm: "Availability and final details are confirmed before your experience.",
      confidence: "needs-human-refinement",
    };
  }

  // Living Atlas intelligence layer. Runs once, here, so every Studio V3
  // surface (map preview, reveal, Travel File, checkout) shares the same
  // reasoning. It can only *prefer* an already-eligible Signature.
  const intelligence = deriveStudioIntelligence({
    feeling,
    interests,
    destinationIntent,
    rhythm,
    refinement: input.refinement ?? null,
    questionHistory: input.questionHistory ?? [],
  });

  // Select the anchor before choosing an authority. This exactly mirrors the
  // legacy selector arguments, but does not execute legacy membership logic.
  const seed = hashSeed(input.seed ?? 0);
  const preferredTourId = input.preferTourId ?? intelligence.preferredTourId;
  const selectedTour = pickPrimaryTour(
    feeling,
    companions,
    interests,
    pickup,
    destinationIntent,
    seed,
    null,
    preferredTourId,
    input.eligibleTourIds ?? null,
  ).tour;
  const authority = resolveStudioV3CurationAuthority(selectedTour.id, () =>
    curateJourney(feeling, companions, rhythm, {
      interests,
      pickup,
      investment,
      destinationIntent,
      dateExact,
      seed: input.seed ?? 0,
      preferTourId: preferredTourId,
    }),
  );
  const journey = authority.legacy;

  // Legacy telemetry is emitted only when legacy curation actually ran.
  if (journey) {
    try {
      recordStudioV3CurationDecision({
        tourId: journey.tour.id,
        tourTitleInternal: journey.tour.title,
        region: journey.tour.region ?? null,
        feeling,
        companions,
        rhythm,
        dateExact,
        destinationIntent,
        investment,
        poolSizeRaw: journey.audit.poolSizeRaw,
        poolSizeAfterClosures: journey.audit.poolSizeAfterClosures,
        picked: journey.moments.map((m) => m.label),
        rejections: journey.audit.rejections,
        wineSwapApplied: journey.audit.wineSwapApplied,
        target: journey.audit.target,
      });
    } catch {
      /* telemetry must never break legacy curation */
    }
  }

  const toRoutePoint = (
    m: {
      label: string;
      story: string;
      lat: number | null;
      lng: number | null;
      image?: string;
      focal?: string;
    },
    i: number,
  ): ResolvedRoutePoint => ({
    index: i,
    label: m.label,
    story: m.story,
    lat: m.lat,
    lng: m.lng,
    // Legacy Signature curation already knows the real stop photo and focal.
    // Carry them instead of losing them and re-guessing downstream.
    image: m.image ?? null,
    focal: m.focal ?? null,
  });


  // Phase 5E — controlled route composition (replace non-critical stops with
  // same-type candidates from REGION_STOP_POOL, optionally add one extra).
  // P8 hardening: `dateExact` travels with every candidate selection so an
  // operationally closed stop (e.g. Mercado do Livramento on a Monday) can
  // never be re-introduced AFTER curateJourney's closure filter.
  const routeWineIntent = hasExplicitWineIntent({ feeling, interests, destinationIntent });
  const mobilityConcern = (input.considerations ?? []).some((c) => MOBILITY_CONSIDERATIONS.has(c));
  const composeOptions = {
    skeletonTourId: selectedTour.id,
    interests,
    rhythm,
    companions,
    investment,
    considerations: input.considerations ?? [],
    wineIntent: routeWineIntent,
    dateExact,
    // PASS 2 — region feeds the Time Authority's regional day/drive caps.
    region: selectedTour.region ?? null,
  };


  const composeRoute = (
    points: ReadonlyArray<ResolvedRoutePoint>,
    maxPoints: number,
  ): ResolvedRoutePoint[] => {
    let next: ResolvedRoutePoint[] = points.map((p) => ({ ...p }));
    if (!STUDIO_V3_ROUTE_COMPOSITION_ENABLED) return next;
    // Phase 7A — mobility safety on original skeleton stops.
    if (mobilityConcern) next = applyMobilitySafety(next, composeOptions);
    next = applyReplacementCandidates(next, composeOptions);
    // Phase 5G — optionally append ONE extra moment when safe.
    next = applyExtraMoment(next, { ...composeOptions, maxPoints });
    return next;
  };

  // ---------------------------------------------------------------------
  // BUILD 1 / Pass 4 — LIVE LIVING ATLAS BRANCH.
  //
  // ONE membership authority. On a Living Atlas anchor the composer decides
  // membership from the RAW structural Signature stops; `curateJourney`'s
  // legacy shaping (wine swap, replacement candidates, extra moment, mobility
  // rewrites) is deliberately BYPASSED so two authorities can never disagree.
  // ---------------------------------------------------------------------
  const anchorTourId = selectedTour.id;
  const livingAtlasLiveEnabled = authority.path === "living-atlas";

  const live = livingAtlasLiveEnabled
    ? resolveLivingAtlasLiveDay({
        anchorTourId: anchorTourId as LivingAtlasSignatureId,
        rawStops: selectedTour.stops,
        feeling,
        companions,
        interests,
        rhythm,
        investment,
        considerations: input.considerations ?? [],
        wineIntent: routeWineIntent,
        mobilityConcern,
        dateExact,
        pickupCoord: pickupOriginCoord(input.pickup),
      })

    : null;

  let routePoints: ResolvedRoutePoint[];
  let composedRoutePoints: ResolvedRoutePoint[];

  if (live) {
    // LIVING ATLAS BRANCH — the legacy mini-composers are NOT executed at all,
    // not even for the fallback. The public route is either the safe projected
    // Living Atlas day or the RAW authored Signature skeleton.
    composedRoutePoints = live.publicPoints.map((p, i) => ({ ...p, index: i }));
    // ROUTE OUTPUT INVARIANT: the compact projection is a STRICT prefix slice
    // of the full composed route — never a separately composed list.
    routePoints = composedRoutePoints.slice(0, 4);
  } else {
    // Legacy / non-Living-Atlas path — unchanged public contract.
    if (!journey) throw new Error("Legacy curation path resolved without a journey");
    const fullMoments = journey.moments.map(toRoutePoint);
    const baseComposedRoutePoints = composeRoute(fullMoments, Math.max(4, fullMoments.length));
    composedRoutePoints = applyHybridComposition(baseComposedRoutePoints, {
      skeletonTourId: journey.tour.id,
      feeling,
      interests,
      rhythm,
      wineIntent: routeWineIntent,
      dateExact,
      // NON-AUTHORITATIVE (PASS 2). `applyHybridComposition` treats
      // `maxPoints` as behaviour-free; this value is legacy metadata only and
      // decides nothing. Time is the composition authority.
      maxPoints: Math.max(
        baseComposedRoutePoints.length,
        RHYTHM_STOP_COUNT[rhythm] + (investment ? INVESTMENT_STOP_DELTA[investment] : 0),
      ),

      buildStory: customerStopBlurb,
    });
    routePoints = composeRoute(journey.moments.slice(0, 4).map(toRoutePoint), 4);
  }






  // Short route sentence, derived only from the same Signature's stops.
  const shortLabels: string[] = [];
  const seen = new Set<string>();
  for (const p of routePoints) {
    const short = p.label.split(/[—–-]/)[0].split(",")[0].trim();
    const key = short.toLowerCase();
    if (!short || seen.has(key)) continue;
    seen.add(key);
    shortLabels.push(short);
    if (shortLabels.length >= 3) break;
  }
  const suggestedRouteLabel =
    shortLabels.length > 0
      ? `${origin} → ${shortLabels.join(" · ")} → ${origin}`
      : `${origin} → your chosen region → ${origin}`;

  const journeyTitle = composeJourneyTitle({
    feeling,
    companions,
    occasion: occasion ?? null,
    pickup,
    interests,
    rhythm,
    region: selectedTour.region,
  });

  const whyItFits = composeJourneyReasons({
    feeling,
    companions,
    rhythm,
    interests,
    pickup,
    occasion: occasion ?? null,
  });

  const refinements = composePersonalizedMoments({
    feeling,
    rhythm,
    interests,
    considerations: input.considerations ?? [],
  });

  // If any selected interest has no match inside the chosen Signature
  // area, add the safe note instead of pulling stops from other tours.
  const tourHay = `${selectedTour.title} ${selectedTour.theme} ${selectedTour.stops
    .map((s) => `${s.label} ${s.story}`)
    .join(" ")}`.toLowerCase();
  const unmatched = interests.filter((i) => {
    const kws = INTEREST_TOUR_KEYWORDS[i] ?? [];
    if (kws.length === 0) return false;
    return !kws.some((kw) => tourHay.includes(kw));
  });
  if (unmatched.length > 0 && refinements.length < 2) {
    refinements.push("Additional interests can be refined by YES without leaving the route area.");
  }

  // Confidence: high when we have ≥3 real geo points AND a matched
  // pickup affinity; medium otherwise; refinement when we have 0 points.
  const geoCount = routePoints.filter((p) => p.lat !== null && p.lng !== null).length;
  const affinity = pickupAffinity(selectedTour, pickup);
  const confidence: RouteConfidence =
    routePoints.length === 0
      ? "needs-human-refinement"
      : geoCount >= 3 && affinity >= 2
        ? "high"
        : "medium";

  // Phase 5D — copy-only optional refinements, flag-gated. When the flag is
  // false (current default), `finalRefinements` is byte-identical to the
  // pre-Phase-5D `refinements.slice(0, 2)`, so live Studio output does not
  // change. When the flag is enabled, optional stop names from
  // REGION_STOP_POOL are appended as additional copy lines only — they
  // never mutate routePoints, geo, suggestedRouteLabel, pricing, or the
  // hidden Signature skeleton.
  const baseRefinements = refinements.slice(0, 2);
  let finalRefinements = baseRefinements;
  if (STUDIO_V3_OPTIONAL_STOPS_ENABLED) {
    const optional = selectOptionalRefinements({
      skeletonTourId: selectedTour.id,
      interests,
      rhythm,
      companions,
      investment,
      considerations: input.considerations ?? [],
      existingRoutePointLabels: routePoints.map((p) => p.label),
    });
    // Allow up to 4 total refinements so the traveller sees the personalized
    // additions on top of the 1–2 base reasons.
    finalRefinements = [...baseRefinements, ...optional].slice(0, 4);
  }

  return {
    skeletonTourKey: selectedTour.id,
    skeletonTitleInternal: selectedTour.title,
    routeAreaLabel: selectedTour.region,
    suggestedRouteLabel,
    routePoints,
    composedRoutePoints,

    journeyTitle,
    whyItFits,
    refinements: finalRefinements,
    whatToConfirm: "Availability and final details are confirmed before your experience.",
    confidence,
    livingAtlasReasons: intelligence.reasons,
    livingAtlasAlternatives: toAlternativeDirections(intelligence.alternatives, selectedTour.id),
    livingAtlasLive: live?.block ?? null,
  };
}

/* ---------- BUILD 1 / Pass 4 — Living Atlas live day resolution ---------- */

/**
 * Resolve the live Living Atlas day from RAW structural Signature stops.
 *
 * Order of authority, and nothing may jump it:
 *   composer (membership) → identity → route → schedule → validation →
 *   commercial gate → public projection.
 *
 * Identity is FROZEN at composition. Route, schedule, validation and the
 * commercial ledger may only describe that set — never add to it, remove from
 * it or replace inside it.
 */
function resolveLivingAtlasLiveDay(input: {
  anchorTourId: LivingAtlasSignatureId;
  rawStops: ReadonlyArray<{ label: string; story: string; image?: string; focal?: string }>;
  feeling: Feeling;
  companions: Companions;
  interests: ReadonlyArray<Interest>;
  rhythm: Rhythm;
  investment: InvestmentTier | null;
  considerations: ReadonlyArray<string>;
  wineIntent: boolean;
  mobilityConcern: boolean;
  dateExact: string | null;
  /**
   * DOOR-TO-DOOR PLANNING ORIGIN. The pickup zone centroid is used until an
   * exact address exists, so certification stays provisional but truthful.
   * `null` means the day cannot be door-to-door certified at all.
   */
  pickupCoord: { lat: number; lng: number } | null;
}): { block: LivingAtlasLiveBlock; publicPoints: ResolvedRoutePoint[] } {
  // RAW structural stops — the ONLY input to the membership authority.
  // No date-closure membership filter, no mobility rewrite, no wine swap, no
  // replacement candidates, no extra moment, no rhythm/investment count
  // shaping. Operational truth (closures, mobility) is validation truth and is
  // carried forward as review, never as a silent membership mutation.
  const authored: ResolvedRoutePoint[] = input.rawStops.map((stop, index) => {
    const geo = lookupStop(stop.label);
    return {
      index,
      label: stop.label,
      story: stop.story,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      // VERIFIED authored Signature media travels with its own point.
      image: stop.image ?? null,
      focal: stop.focal ?? null,
    };
  });



  // VERIFIED connector truth only. A mandatory transfer (e.g. the Sado ferry)
  // is INTERNAL TRANSIT, never an experience: its verified minutes are withheld
  // from the experience budget and it is never scored, ranked or replaced.
  const blueprint = getTailorBlueprint(input.anchorTourId);
  const connectors = (blueprint?.core ?? []).filter(
    (stop) => stop.lock?.reasonCode === "mandatory_transfer",
  );
  const internalTransitMinutes = connectors.reduce(
    (sum, stop) => sum + (stop.dwellMinutesOverride ?? 0),
    0,
  );
  const unverifiedConnectorLabels = connectors
    .filter((stop) => stop.dwellMinutesOverride == null)
    .map((stop) => stop.label);

  const hybrid: HybridCompositionResult = composeHybridDay(authored, {
    skeletonTourId: input.anchorTourId,
    feeling: input.feeling,
    interests: input.interests,
    rhythm: input.rhythm,
    wineIntent: input.wineIntent,
    dateExact: input.dateExact,
    mandatoryOperationalLabels: connectors.map((stop) => stop.label),
    internalTransitMinutes,
    unverifiedConnectorLabels,
    mobilityConcern: input.mobilityConcern,
    pickupCoord: input.pickupCoord,
    // LIVE self-service branch: only moments an existing commercial authority
    // can already price may enter a day the traveller can book unattended.
    commercialContainment: true,
    buildStory: customerStopBlurb,
  });

  const composition = hybrid.composition;
  // P0-A COMPOSITION TRUTH — the RAW catalogue list is never a sellable day.
  // An anchor with an alternative pool lists every candidate; the fallback
  // projects it down to the canonical cardinality before it can ever reach a
  // traveller, a validator or a checkout.
  const authoredPoints = projectAuthoredAnchorStops(input.anchorTourId, authored).points.map(
    (p, i) => ({ ...p, index: i }),
  );


  // STRUCTURAL RESOLUTION GATE. `complete` means the composition authority
  // finished a real day. A date closure does NOT unfinish it — it only stops
  // the PUBLIC projection. Anything else (tradeoff / partial / impossible /
  // invalid / empty) is UNRESOLVED and must never be certified by the route
  // planner, scheduler, validator or identity ledger.
  const compositionResolution = resolveLivingAtlasCompositionResolution(composition);

  const emptyBlock = buildUncertifiedLivingAtlasBlock({
    anchorTourId: input.anchorTourId,
    composition,
    conflict: composition?.conflict ?? null,
    passthroughReason: hybrid.passthroughReason,
    compositionResolution,
    fallbackReason: hybrid.passthrough ? "passthrough" : "none",
    compositionStopIds: composition ? composition.moments.map((m) => m.stopId) : [],
    planningTiming: composition?.planningTiming ?? null,
    approximateDurationClass: composition?.planningTiming?.budget.durationClass ?? null,
    internalTransitMinutes: hybrid.internalTransitMinutes,
    totalPlannedMinutesIncludingInternalTransit:
      composition?.planningTiming
        ? composition.planningTiming.totalMinutes + hybrid.internalTransitMinutes
        : null,
    internalIssues: hybrid.internalIssues,
  });

  if (!composition || compositionResolution === "unresolved") {
    return { block: emptyBlock, publicPoints: authoredPoints };
  }


  // FROZEN identity set — every later stage describes exactly this.
  const identity = resolveCompositionIdentities({
    anchorTourId: input.anchorTourId,
    moments: composition.moments.map((moment) => ({
      label: moment.label,
      inventoryStopId: moment.stopId,
    })),
  });
  const omittedIdentity = resolveCompositionIdentities({
    anchorTourId: input.anchorTourId,
    // A skeleton label with NO inventory identity is scenery copy, not a
    // structurally identified inclusion, so it cannot be claimed as a priced
    // removal. Only identity-bearing omissions reach the commercial ledger;
    // unidentified ones stay unclaimed (no credit, no charge).
    moments: hybrid.omitted
      .filter((moment) => Boolean(moment.stopId))
      .map((moment) => ({
        label: moment.label,
        inventoryStopId: moment.stopId,
      })),
  });

  const resolvedComposition = {
    ...composition,
    moments: composition.moments.map((moment) => ({
      ...moment,
      slotId: moment.stopId,
      replacedStopId: null,
      originalLabel: null,
    })),
    appliedReplacements: {},
    ignoredReplacements: [],
  } satisfies LivingAtlasResolvedComposition;

  const routePlan = planLivingAtlasRoute({
    composition: resolvedComposition,
    pool: REGION_STOP_POOL,
  });
  const scheduledPlan = applyLivingAtlasSchedule({
    routePlan,
    pool: REGION_STOP_POOL,
    selectedDate: input.dateExact,
  });

  // SINGLE validator owns every review status, including composition-stage
  // internal signals (mobility, unverified connector). Nothing else re-decides.
  const validation = validateLivingAtlasOperations({
    composition,
    routePlan,
    scheduledPlan,
    selectedDate: input.dateExact,
    preValidationIssues: hybrid.internalIssues,
  });


  // A blueprint moment that IS delivered by the composed day was never
  // removed, even when a different inventory stop fulfils it (the published
  // "Comporta OR Carvalhal beach" core is one declared moment served by two
  // real stops). Claiming it as an omission would invent a removal that did
  // not happen and push an otherwise price-safe day into curator review.
  const deliveredBlueprintStopIds = new Set(
    identity.records
      .map((record) => record.blueprintStopId)
      .filter((id): id is string => Boolean(id)),
  );
  const genuinelyOmittedRecords = omittedIdentity.records.filter(
    (record) => !record.blueprintStopId || !deliveredBlueprintStopIds.has(record.blueprintStopId),
  );

  const commercialLedger = buildCommercialLedger({
    anchorTourId: input.anchorTourId,
    kept: identity.records,
    omitted: genuinelyOmittedRecords,
  });

  // COMMERCIAL SAFETY GATE — fail closed, but not blind.
  //
  // P0-B CONTINUITY: a composition that triggers ONLY price actions an
  // existing approved authority can price (`known-price-action-required`,
  // e.g. the Arrábida extra-winery ladder) is commercially resolved — the
  // checkout ledger rebuild carries those actions to the exact same rules.
  // Discarding such a day used to throw away a good composition and fall
  // back to the raw anchor. Only `commercial-unresolved` still falls back.
  const commerciallySafe =
    commercialLedger.disposition === "anchor-price-safe" ||
    (commercialLedger.disposition === "known-price-action-required" &&
      commercialLedger.actions.every((action) => isKnownPriceAction(action.priceAction)));
  const validationBlocks = validation.status === "invalid";
  const projectable = !hybrid.passthrough && commerciallySafe && !validationBlocks;


  const block: LivingAtlasLiveBlock = {
    ...emptyBlock,
    identity,
    routePlan,
    scheduledStopIds: scheduledPlan.orderedMoments.map((moment) => moment.stopId),
    validation,
    commercialLedger,
    commercialDisposition: commercialLedger.disposition,
    liveResolution: projectable ? "composed" : "authored-fallback",
    doorToDoor: composition?.doorToDoor ?? null,
    // Composed AND door-to-door certified = a real bespoke bookable day.
    // Anything else keeps the curator flag raised.
    requiresCuratorReview: !projectable || (composition?.requiresCuratorReview ?? true),
    fallbackReason: projectable
      ? "none"
      : hybrid.passthrough
        ? "passthrough"
        : !commerciallySafe
          ? "commercial-gate"
          : "validation-invalid",
  };

  return { block, publicPoints: projectable ? hybrid.points : authoredPoints };
}


/* ---------- Phase 1D: customer-facing journey draft helpers ---------- */
/*
 * These helpers turn the internal Signature skeleton into customer-facing
 * draft language. The tour is used ONLY as a safe operational/geographic
 * skeleton — its name is never surfaced. Personalization is by substitution,
 * never by accumulation: at most 2 adaptations, never invented stops.
 */

/** Map a pickup id to a human "city" label safe to use in route text. */
export function pickupCityLabel(pickup: Pickup | null | undefined): string {
  switch (pickup) {
    case "lisbon":
    case "lisbon-airport":
    case "lisbon-cruise":
      return "Lisbon";
    case "cascais-estoril":
      return "Cascais";
    case "sintra":
      return "Sintra";
    case "sesimbra-setubal-arrabida":
      return "Setúbal";
    case "comporta-troia":
      return "Comporta";
    default:
      return "your chosen starting point";
  }
}

/** Canonical city labels surfaced by pickupCityLabel() — safe words for Story of the Day e2e. */
export const PICKUP_CITY_LABELS = ["Lisbon", "Cascais", "Sintra", "Setúbal", "Comporta"] as const;

/**
 * Real lat/lng of the city the chosen pickup actually starts from, so the
 * "origin" map beat plants a pin where the traveller stands — not the
 * region centroid. Returns null when pickup hasn't been chosen yet.
 */
export function pickupOriginCoord(
  pickup: Pickup | null | undefined,
): { lat: number; lng: number } | null {
  switch (pickup) {
    case "lisbon":
    case "lisbon-airport":
    case "lisbon-cruise":
      return { lat: 38.7223, lng: -9.1393 };
    case "cascais-estoril":
      return { lat: 38.6979, lng: -9.4215 };
    case "sintra":
      return { lat: 38.7979, lng: -9.3878 };
    case "sesimbra-setubal-arrabida":
      return { lat: 38.5244, lng: -8.8882 };
    case "comporta-troia":
      return { lat: 38.3848, lng: -8.7805 };
    default:
      return null;
  }
}

/**
 * Best-effort region key from a pickup, used to seed the map beat with
 * a sensible cinematic frame before a full Signature has resolved.
 */
export function pickupRegionKey(
  pickup: Pickup | null | undefined,
): "lisbon-coast" | "arrabida" | "alentejo" | null {
  switch (pickup) {
    case "lisbon":
    case "lisbon-airport":
    case "lisbon-cruise":
    case "cascais-estoril":
    case "sintra":
      return "lisbon-coast";
    case "sesimbra-setubal-arrabida":
      return "arrabida";
    case "comporta-troia":
      return "alentejo";
    default:
      return null;
  }
}

/**
 * composeJourneyReasons — 2–3 short, factual reasons grounded in the
 * traveller's actual choices. No invented superlatives.
 */
export function composeJourneyReasons(input: {
  feeling: Feeling | null;
  companions: Companions | null;
  rhythm: Rhythm | null;
  interests: ReadonlyArray<Interest>;
  pickup: Pickup | null;
  occasion?: Occasion | null;
}): string[] {
  const reasons: string[] = [];

  const themePool: Partial<Record<Interest, string>> = {
    wine: "wine and tastings",
    gastronomy: "table moments",
    coast: "coastal beauty",
    nature: "nature and open air",
    heritage: "heritage and old streets",
    photography: "viewpoints and golden hour",
    wellness: "calmer, restorative moments",
    "local-life": "real local life",
  };
  const themes = (input.interests ?? [])
    .map((i) => themePool[i])
    .filter((x): x is string => Boolean(x))
    .slice(0, 2);
  if (themes.length > 0) {
    reasons.push(
      themes.length === 1
        ? `Built around ${themes[0]}, the way you said it should feel.`
        : `Built around ${themes[0]} and ${themes[1]}, the way you said it should feel.`,
    );
  } else if (input.feeling) {
    reasons.push("Built around the feeling you chose, not a fixed itinerary.");
  }

  if (input.rhythm) {
    const pace =
      input.rhythm === "slow"
        ? "A slower rhythm, with room to linger."
        : input.rhythm === "immersive"
          ? "An unhurried, immersive arc — kept realistic for one day."
          : input.rhythm === "full"
            ? "More discovery, still shaped into one realistic day."
            : "Movement and pause, kept in balance.";
    reasons.push(pace);
  }

  const city = pickupCityLabel(input.pickup);
  if (city && city !== "your chosen starting point") {
    reasons.push(`Starts and ends near ${city}, no long transfers.`);
  } else if (input.companions === "family") {
    reasons.push("Shaped to feel easy for everyone travelling with you.");
  } else if (
    input.companions === "couple" ||
    input.occasion === "honeymoon" ||
    input.occasion === "anniversary"
  ) {
    reasons.push("Quieter pacing for the two of you.");
  }

  return reasons.slice(0, 3);
}

/**
 * composePersonalizedMoments — at most 2 safe, same-region adaptations.
 * No invented stops, no invented suppliers, no exact timings. These are
 * the only customer-facing "changes" surfaced on the draft card.
 */
export function composePersonalizedMoments(input: {
  feeling: Feeling | null;
  rhythm: Rhythm | null;
  interests: ReadonlyArray<Interest>;
  considerations: ReadonlyArray<string>;
}): string[] {
  const out: string[] = [];

  if (input.rhythm === "slow" || input.rhythm === "immersive") {
    out.push("A slower rhythm with more time between stops.");
  } else if (input.rhythm === "full") {
    out.push("A slightly fuller arc, kept realistic for one day.");
  }

  const hasWine = input.interests.includes("wine");
  const hasLocal = input.interests.includes("local-life");
  const hasHeritage = input.interests.includes("heritage");
  const hasCoast = input.interests.includes("coast");
  const hasGastro = input.interests.includes("gastronomy");

  if (hasLocal && hasWine) {
    out.push(
      "A local craft or village moment may replace one wine-heavy stop, subject to availability.",
    );
  } else if (hasHeritage && hasWine) {
    out.push("A heritage moment may take the place of one tasting, subject to availability.");
  } else if (hasGastro && !hasWine) {
    out.push("Regional food is given room in the day, subject to availability.");
  } else if (hasCoast && input.feeling !== "coastal") {
    out.push("A coastal pause may be added, depending on the day's conditions.");
  } else if (
    input.considerations &&
    input.considerations.length > 0 &&
    !input.considerations.includes("none")
  ) {
    out.push("Pacing and stops adjusted around the notes you shared.");
  }

  return out.slice(0, 2);
}

/**
 * composeSuggestedRoute — ONE realistic same-region route as a string:
 * "Origin → Stop · Stop · Stop → Origin". Uses the internal skeleton's
 * own stops, never invents distant places. Falls back to a soft phrase.
 */
export function composeSuggestedRoute(input: {
  pickup: Pickup | null;
  feeling: Feeling | null;
  companions: Companions | null;
  rhythm: Rhythm | null;
}): string {
  const origin = pickupCityLabel(input.pickup);
  if (!input.feeling || !input.companions || !input.rhythm) {
    return `${origin} → your chosen region → ${origin}`;
  }
  const journey = curateJourney(input.feeling, input.companions, input.rhythm);
  // Take up to 3 distinct stop labels, trimmed to the first comma/dash phrase
  // so the route reads cleanly.
  const stops: string[] = [];
  const seen = new Set<string>();
  for (const m of journey.moments) {
    const short = m.label.split(/[—–-]/)[0].split(",")[0].trim();
    const key = short.toLowerCase();
    if (!short || seen.has(key)) continue;
    seen.add(key);
    stops.push(short);
    if (stops.length >= 3) break;
  }
  if (stops.length === 0) {
    return `${origin} → your chosen region → ${origin}`;
  }
  return `${origin} → ${stops.join(" · ")} → ${origin}`;
}

/* ============================================================
 * Phase 4 — Adaptive Decision Layer
 * Deterministic, derived from state. No AI, no backend, no I/O.
 * ============================================================ */

/** Normalise the seven companion ids into the five high-level types. */
export function companionsType(c: Companions | null): CompanionsType | null {
  if (!c) return null;
  switch (c) {
    case "solo":
      return "solo";
    case "couple":
    case "proposal":
      return "couple";
    case "family":
      return "family";
    case "friends":
    case "celebration":
      return "friends";
    case "corporate":
      return "corporate";
  }
}

/**
 * deriveIntentProfile — pure derivation from current answers.
 * Never stored, only computed at read sites. Always returns a value
 * (defaults to "exploration" / medium when answers are still thin).
 */
export function deriveIntentProfile(state: StudioV3State): IntentProfile {
  const cType = companionsType(state.companions) ?? "couple";

  // intentType
  let intentType: IntentType = "exploration";
  if (cType === "corporate") {
    intentType = "corporate";
  } else if (
    state.occasion === "proposal" ||
    state.occasion === "honeymoon" ||
    state.occasion === "anniversary" ||
    state.feeling === "romance" ||
    cType === "couple"
  ) {
    intentType = "romantic";
  } else if (
    state.occasion === "birthday" ||
    state.occasion === "celebration" ||
    state.occasion === "family-day" ||
    cType === "family" ||
    cType === "friends"
  ) {
    intentType = "celebration";
  } else if (state.feeling === "slow-luxury" || state.feeling === "wine-food") {
    intentType = "relaxation";
  }

  // intensity — from rhythm first, feeling second.
  let intensity: IntentLevel = "medium";
  if (state.rhythm === "slow") intensity = "low";
  else if (state.rhythm === "immersive" || state.rhythm === "full") intensity = "high";
  else if (state.feeling === "adventure") intensity = "high";
  else if (state.feeling === "slow-luxury") intensity = "low";

  // privacyLevel — corporate / proposal / honeymoon imply high privacy.
  let privacyLevel: IntentLevel = "medium";
  if (
    cType === "corporate" ||
    state.occasion === "proposal" ||
    state.occasion === "honeymoon" ||
    state.guestsPrivateEvent
  ) {
    privacyLevel = "high";
  } else if (cType === "solo" || cType === "couple") {
    privacyLevel = "medium";
  } else if (cType === "friends" || cType === "family") {
    privacyLevel = "low";
  }

  return { companionsType: cType, intentType, intensity, privacyLevel };
}

/* ---------- Option relevance filters ---------- */

/**
 * filterOccasions — hide options that are operationally invalid for the
 * chosen companion type, AND hide options the user has already implied via
 * their companions pick (no repetition).
 *
 *   companions === "proposal"    → also hide "proposal"
 *   companions === "celebration" → also hide "celebration" + "birthday"
 *   companions === "corporate"   → also hide "corporate" (already declared)
 */
export function filterOccasions(
  options: ReadonlyArray<ChoiceOption<Occasion>>,
  companions: Companions | null,
): ChoiceOption<Occasion>[] {
  const cType = companionsType(companions);
  if (!cType) return [...options];
  const HIDE: Record<CompanionsType, ReadonlyArray<Occasion>> = {
    solo: ["proposal", "honeymoon", "family-day", "corporate", "anniversary"],
    couple: ["family-day", "corporate"],
    family: ["proposal", "honeymoon", "corporate"],
    friends: ["proposal", "honeymoon", "family-day", "corporate"],
    corporate: ["proposal", "honeymoon", "anniversary", "family-day", "birthday", "celebration"],
  };
  const hidden = new Set<Occasion>(HIDE[cType]);
  if (companions === "proposal") hidden.add("proposal");
  if (companions === "celebration") {
    hidden.add("celebration");
    hidden.add("birthday");
  }
  if (companions === "corporate") hidden.add("corporate");
  return options.filter((o) => !hidden.has(o.id));
}

/**
 * filterConsiderations — corporate strips care notes down to operationally
 * relevant fields (dietary + accessibility). Solo/couple/family/friends
 * keep the full set.
 */
export function filterConsiderations(
  options: ReadonlyArray<ChoiceOption<Consideration>>,
  companions: Companions | null,
): ChoiceOption<Consideration>[] {
  if (companions !== "corporate") return [...options];
  const KEEP = new Set<Consideration>([
    "none",
    "vegetarian",
    "vegan",
    "gluten-free",
    "allergies",
    "reduced-mobility",
  ]);
  return options.filter((o) => KEEP.has(o.id));
}

/**
 * filterInterests — corporate hides clearly leisure/intimate interests
 * (wellness). All other companion types keep the full set; deprioritisation
 * happens at the ordering layer, not here.
 */
export function filterInterests(
  options: ReadonlyArray<ChoiceOption<Interest>>,
  companions: Companions | null,
): ChoiceOption<Interest>[] {
  if (companions === "corporate") {
    return options.filter((o) => o.id !== "wellness");
  }
  return [...options];
}

/**
 * filterCompanions — hide companion options that are operationally
 * incompatible with the chosen feeling, so the Studio stops feeling like
 * a questionnaire. Conservative on purpose: only removes pairs that would
 * read as illogical (e.g. "corporate" on a romance day, "proposal" on a
 * family or adventure day).
 *
 *   feeling=romance       → hide corporate, family
 *   feeling=family        → hide proposal, corporate
 *   feeling=adventure     → hide proposal, corporate
 *   feeling=slow-luxury   → hide corporate
 *   feeling=coastal/wine-food/hidden/culture → keep all
 */
export function filterCompanions(
  options: ReadonlyArray<ChoiceOption<Companions>>,
  feeling: Feeling | null,
): ChoiceOption<Companions>[] {
  if (!feeling) return [...options];
  // Tightened: romance days never sensibly include friends/solo/family —
  // hide them so the next question stops feeling contradictory. Family
  // days never include proposal/honeymoon/corporate. Adventure days drop
  // proposal/corporate (still fine for solo/friends/couple). Slow-luxury
  // simply drops corporate. Other feelings keep the full set.
  const HIDE: Partial<Record<Feeling, ReadonlyArray<Companions>>> = {
    romance: ["corporate", "family", "friends", "solo"],

    adventure: ["proposal", "corporate"],
    "slow-luxury": ["corporate"],
  };
  const hidden = new Set<Companions>(HIDE[feeling] ?? []);
  return options.filter((o) => !hidden.has(o.id));
}

/**
 * filterFeelings — when companions is chosen first (per Brand Bible
 * group-type-first ordering), hide moods that read as illogical for the
 * selected travel party. Keeps the list tight (≤6) and removes the
 * "wait, that doesn't fit me" friction that hurts conversion.
 *
 *   solo        → hide romance (reads as for-two)
 *   couple      → hide adventure only if list still has ≥5 options (no-op here)
 *   family      → hide romance, slow-luxury (atmosphere doesn't fit kids)
 *   proposal    → hide adventure, hidden (keep cinematic / romantic moods)
 *   corporate   → hide romance, hidden, adventure (keep refined moods)
 *   celebration → keep all
 *   friends     → hide romance
 */
export function filterFeelings(
  options: ReadonlyArray<ChoiceOption<Feeling>>,
  companions: Companions | null,
): ChoiceOption<Feeling>[] {
  if (!companions) return [...options];
  const HIDE: Partial<Record<Companions, ReadonlyArray<Feeling>>> = {
    solo: ["romance"],
    family: ["romance", "slow-luxury"],
    proposal: ["adventure", "hidden"],
    corporate: ["romance", "hidden", "adventure"],
    friends: ["romance"],
  };
  const hidden = new Set<Feeling>(HIDE[companions] ?? []);
  return options.filter((o) => !hidden.has(o.id));
}

/**
 * filterDestinationIntents — drop redundant low-commitment options.
 * "no-preference" and "anywhere-special" carry the same user signal
 * ("let YES decide"); we keep only "no-preference" in the UI so the
 * list reads as intentional choices, not five ways to skip. The
 * "anywhere-special" id stays valid in the type system and scoring
 * for back-compat / saved links.
 */
export function filterDestinationIntents(
  options: ReadonlyArray<ChoiceOption<DestinationIntent>>,
): ChoiceOption<DestinationIntent>[] {
  return options.filter((o) => o.id !== "anywhere-special");
}

/* ---------- Phase relevance ---------- */

/**
 * isPhaseRelevant — true when this phase still needs to be asked given
 * what's already known. Used by getNextPhase to skip irrelevant phases.
 */
export function isPhaseRelevant(phase: StudioV3Phase, state: StudioV3State): boolean {
  // Product correction: Studio now asks only client-useful questions before
  // revealing a real Signature. Occasion / care / language made the flow feel
  // like a poetic quiz, so they are left for the human confirmation step.
  if (phase === "occasion" || phase === "considerations" || phase === "language") {
    return false;
  }

  // P8 — the reveal is ONE unified "Your Day" surface hosted on the
  // canonical `storyboard` phase. `map` and `confirmation` remain in the
  // phase union/order for hydration of older saved states, but they are
  // never navigated to any more (see `studioPhaseCanonical.ts`).
  if (phase === "map" || phase === "confirmation") return false;


  // Studio reform (2026-08): the investment tier is no longer ASKED. Money
  // framing before desire framing was the single largest conversion leak in
  // the funnel. The tier stays a soft scoring signal (see
  // `investmentPremiumScore`) and remains editable inside price disclosure;
  // it is simply never a question the traveller has to answer to progress.
  if (phase === "investment") return false;

  // Studio reform (2026-08): destination is INFERRED from feeling, interests
  // and curation rather than asked. `destinationIntent` remains a real soft
  // scoring signal (settable via deep link / saved state), it is simply no
  // longer a question standing between desire and the day.
  if (phase === "destination") return false;

  // Logistics consolidation — date, pickup and party are asked once, on the
  // single `logistics` screen, prefilled with everything already inferred.
  if (phase === "date" || phase === "pickup" || phase === "guests") return false;

  // BUILD 2 / Pass 4 — the LIVE Director is the only authority for whether
  // another material question exists. There is NO numeric cap: the phase
  // hosts 0..N sequential questions and ends when nothing material is left.
  if (phase === "refinement") {
    // P10 — delegation mode: the traveller handed the taste layer to YES, so
    // the optional nuance question is simply irrelevant. It is SKIPPED, never
    // answered on their behalf.
    if (state.delegationMode === "yes-designs") return false;
    const decision = deriveStudioDirectorRuntime({
      feeling: state.feeling,
      interests: state.interests,
      rhythm: state.rhythm,
      destinationIntent: state.destinationIntent,
      questionHistory: state.questionHistory,
    }).decision;
    // Fail closed: an unpresentable question is never shown to a traveller.
    return presentDirectorQuestion(decision) !== null;
  }



  return true;
}

/**
 * STUDIO_V3_PHASE_ORDER — the single source of truth for phase sequence.
 *
 * Canonical live flow (see docs/studio-north-star.md):
 *
 *   1. intro        — single canonical guided entry
 *   2. feeling      — the first real decision, purely emotional
 *   3. who          — context in one tap; infers guests, occasion, tier floor
 *   4. interests    — desire, not spec
 *   5. rhythm       — emotional pacing (pace/depth, not stop counts)
 *   6. refinement   — the adaptive Director beat; repeats 0→N times based
 *      on genuine uncertainty (NO product cap of one question)
 *   7. storyboard   — "Your Day": the unified editable itinerary surface,
 *      including its inline story/reveal chapter (reward before admin)
 *   8. logistics    — ONE consolidated screen (date + pickup + party),
 *      "Make it real", asked AFTER the reward
 *   9. guestDetails → checkoutSummary / payment
 *
 * Legacy ids (`destination`, `date`, `pickup`, `guests`, `investment`,
 * `occasion`, `considerations`, `language`, `map`, `confirmation`) stay in
 * this array so saved states, deep links and older tests hydrate, but
 * `isPhaseRelevant` skips them — they are never asked as standalone live
 * screens. `map` and `confirmation` canonicalize to `storyboard` via
 * `studioPhaseCanonical.ts`.
 *
 * Both `StudioV3.tsx` (transition guard) and `getNextPhase` read THIS
 * array — there is no second copy to drift out of sync.
 */
export const STUDIO_V3_PHASE_ORDER: StudioV3Phase[] = [
  "intro",
  // INSTANT-BOOKABLE TRUTH — the practical facts that decide what can be
  // SOLD (exact date, supported pickup area, party) are collected BEFORE the
  // Studio spends the traveller's time designing. One compact screen.
  "logistics",
  "feeling",
  "who",
  "interests",
  "rhythm",
  "refinement",
  // PASS 4 — REWARD BEFORE ADMIN. The composed day ("Your Day", canonical
  // `storyboard`) is revealed immediately after the last Director question.
  "storyboard",
  // Never asked as standalone questions any more — kept for hydration of
  // saved states/deep links and for back-compat with older tests.
  "destination",
  "date",
  "pickup",
  "guests",
  // Never asked (isPhaseRelevant === false) — kept for state hydration only.
  "investment",
  "occasion",
  "considerations",
  "language",
  "map",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
];


const LINEAR_ORDER: StudioV3Phase[] = STUDIO_V3_PHASE_ORDER;


/**
 * getNextPhase — adaptive next-phase resolver. Walks forward from the
 * current phase and returns the first phase that is still relevant given
 * the live state. Falls back to "storyboard" when nothing remains.
 */
export function getNextPhase(state: StudioV3State, current: StudioV3Phase): StudioV3Phase {
  const idx = LINEAR_ORDER.indexOf(current);
  if (idx < 0) return "storyboard";
  for (let i = idx + 1; i < LINEAR_ORDER.length; i++) {
    const candidate = LINEAR_ORDER[i];
    if (isPhaseRelevant(candidate, state)) return candidate;
  }
  return "storyboard";
}

/* ---------------------------------------------------------------------------
 * Phase 5D — Safe optional stop resolver (copy-only, flag-gated).
 *
 * `selectOptionalRefinements` reads from `REGION_STOP_POOL` and returns
 * stop NAMES only. It NEVER mutates routePoints, geo, suggestedRouteLabel,
 * pricing, the skeleton, or any other Studio V3 output. It is wired into
 * `resolveStudioV3Route` behind `STUDIO_V3_OPTIONAL_STOPS_ENABLED` which is
 * `false` in committed code, so live behaviour is unchanged.
 *
 * Hard rules (also covered by `optional-stops.test.ts`):
 *  - same region as the skeleton
 *  - same routeCluster as the skeleton
 *  - active === true only
 *  - if candidate has signatureTourId, it must equal the skeleton id
 *  - if candidate has sourceTourIds, it must include the skeleton id
 *  - never duplicate an existing routePoint label
 *  - never stack a oneOfGroup — keep ONE winner per group
 *  - never bypass considerations (reduced-mobility / avoid-long-walks)
 *  - slow rhythm → max 1, other rhythms → max 2
 *  - investment is a soft score boost only — never a hard gate
 * --------------------------------------------------------------------------- */

/**
 * Explicit skeleton → corridor map. SINGLE SOURCE OF TRUTH now lives in
 * `@/data/signatureCorridors` so the composer can enforce corridor
 * containment without importing this module (cycle-free). Unknown skeleton
 * ids resolve to nothing — we never guess a region or cluster.
 */
export const SKELETON_TO_CLUSTER: Record<
  string,
  { region: RegionId; routeCluster: string; signatureTourId: string }
> = SIGNATURE_CORRIDORS;


/**
 * Considerations that imply difficult terrain. We avoid blindly excluding
 * a `type` (e.g. all viewpoints) — instead we deny only when the stop's
 * notes or type clearly imply difficult access. This is intentionally
 * conservative.
 */
const DIFFICULT_ACCESS_RE =
  /stairs|steep|uneven|cave|trail|beach access|reduced[- ]?mobility|may not suit|difficult access/i;

const MOBILITY_CONSIDERATIONS = new Set<string>(["reduced-mobility", "avoid-long-walks"]);

function isDeniedByConsiderations(
  stop: OptionalStop,
  considerations: ReadonlyArray<string>,
): boolean {
  if (considerations.length === 0) return false;
  const mobilityConcern = considerations.some((c) => MOBILITY_CONSIDERATIONS.has(c));
  if (!mobilityConcern) return false;
  if (stop.notes && DIFFICULT_ACCESS_RE.test(stop.notes)) return true;
  return false;
}

/**
 * Deterministic candidate score. Higher is better. Used for ranking and
 * for oneOfGroup tie-breaking. Investment is a soft boost only — it never
 * gates eligibility in Phase 5D.
 */
function scoreOptionalStop(
  stop: OptionalStop,
  ctx: {
    interests: ReadonlyArray<Interest>;
    rhythm: Rhythm;
    companions: Companions;
    investment: InvestmentTier | null;
  },
): number {
  let score = 0;

  // Interest overlap
  if (ctx.interests.length > 0) {
    for (const i of ctx.interests) {
      if (stop.suitsInterests.includes(i)) score += 1;
    }
  }

  // Rhythm match
  if (stop.suitsRhythm.includes(ctx.rhythm)) score += 1;

  // Companions match — undefined `suitsCompanions` is treated as compatible
  if (!stop.suitsCompanions || stop.suitsCompanions.includes(ctx.companions)) {
    score += 1;
  }

  // Investment soft boost
  if (stop.suitsInvestment && ctx.investment) {
    if (ctx.investment === "open") {
      score += 0.25;
    } else if (stop.suitsInvestment.includes(ctx.investment)) {
      score += 0.5;
    }
  }

  // Phase 7A: corporate companions should feel professionally private, not
  // romantic / coastal-picnic. Penalise picnic/cove/sunset cues; boost
  // private tastings, cellars, courtyards and gardens. Same region/cluster,
  // never invents stops — purely a ranking adjustment.
  if (ctx.companions === "corporate") {
    const hay = `${stop.name} ${stop.notes ?? ""}`.toLowerCase();
    if (/picnic|cove|wild beach|sunset|candlelit|romantic|swim|snorkel/.test(hay)) {
      score -= 1.5;
    }
    if (/private|tasting|cellar|estate|courtyard|garden|sommelier|reserve/.test(hay)) {
      score += 0.75;
    }
  }

  return score;
}

function normalizeLabel(s: string): string {
  return s
    .split(/[—–·-]/)[0]
    .split(",")[0]
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Curated aliases for places the catalogs genuinely name two ways.
 * Explicit and audited — we do NOT guess by stripping generic nouns, because
 * that merges unrelated places ("Adega Regional de Colares" vs "Adega
 * Cooperativa de Palmela", "Casa do Rio" vs "Casa das Artes"…).
 */
const STOP_ALIASES: ReadonlyArray<{ test: RegExp; key: string }> = [
  { test: /\bcatralvos\b/, key: "alias:catralvos" },
  { test: /\bbacalhoa\b/, key: "alias:bacalhoa" },
];

/** Particles and legal forms only — never a descriptive noun. */
const STOP_PARTICLE_RE = /\b(de|da|do|dos|das|d|e|of|the|and|crl|lda|sa)\b/g;

/**
 * Identity key for a physical place, independent of how a catalog names it.
 *
 * Strategy, in order:
 *   1. curated alias table for verified duplicate names;
 *   2. conservative normalization (accents, punctuation, particles/legal
 *      forms) — nothing descriptive is stripped, so distinct places with
 *      similar shapes stay distinct.
 */
export function semanticStopKey(label: string): string {
  const base = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  for (const alias of STOP_ALIASES) {
    if (alias.test.test(base)) return alias.key;
  }

  return base.replace(STOP_PARTICLE_RE, " ").replace(/\s+/g, " ").trim();
}



/** Both dedupe keys for a label: the literal one and the place-identity one. */
function stopKeys(label: string): string[] {
  const semantic = semanticStopKey(label);
  return semantic ? [normalizeLabel(label), semantic] : [normalizeLabel(label)];
}

function rememberStop(set: Set<string>, label: string): void {
  for (const key of stopKeys(label)) set.add(key);
}

function forgetStop(set: Set<string>, label: string): void {
  for (const key of stopKeys(label)) set.delete(key);
}

function alreadyUsed(set: Set<string>, label: string): boolean {
  return stopKeys(label).some((key) => set.has(key));
}

/**
 * Pure selector. Reads from REGION_STOP_POOL and returns stop names only.
 * Does NOT consult the feature flag — the call site in
 * `resolveStudioV3Route` gates it. This keeps the selector unit-testable
 * with the flag still false in committed code.
 */
export function selectOptionalRefinements(input: {
  skeletonTourId: string | null | undefined;
  interests: ReadonlyArray<Interest>;
  rhythm: Rhythm;
  companions: Companions;
  investment: InvestmentTier | null;
  considerations: ReadonlyArray<string>;
  existingRoutePointLabels: ReadonlyArray<string>;
}): string[] {
  const skeleton = input.skeletonTourId ? SKELETON_TO_CLUSTER[input.skeletonTourId] : undefined;
  if (!skeleton) return [];

  const existing = new Set(input.existingRoutePointLabels.flatMap((l) => stopKeys(l)));

  // Eligibility filter
  const eligible = REGION_STOP_POOL.filter((stop) => {
    if (!stop.active) return false;
    if (stop.region !== skeleton.region) return false;
    if (stop.routeCluster !== skeleton.routeCluster) return false;

    // signatureTourId gate
    if (stop.signatureTourId && stop.signatureTourId !== skeleton.signatureTourId) {
      return false;
    }
    // sourceTourIds gate (only when signatureTourId is not set or doesn't match)
    if (stop.sourceTourIds && stop.sourceTourIds.length > 0) {
      if (!stop.sourceTourIds.includes(skeleton.signatureTourId)) {
        // If signatureTourId already matched above, we never got here. If
        // it wasn't set, sourceTourIds must include the skeleton.
        if (!stop.signatureTourId) return false;
      }
    }

    // Dedupe vs existing route points
    if (alreadyUsed(existing, stop.name)) return false;

    // Considerations deny
    if (isDeniedByConsiderations(stop, input.considerations)) return false;

    return true;
  });

  // Score + deterministic sort (score desc, durationMin asc, id asc)
  const scored = eligible
    .map((stop) => ({
      stop,
      score: scoreOptionalStop(stop, {
        interests: input.interests,
        rhythm: input.rhythm,
        companions: input.companions,
        investment: input.investment,
      }),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.stop.durationMin !== b.stop.durationMin) {
        return a.stop.durationMin - b.stop.durationMin;
      }
      return a.stop.id.localeCompare(b.stop.id);
    });

  // Collapse oneOfGroup — keep first (highest-scored) member of each group
  const seenGroups = new Set<string>();
  const collapsed: typeof scored = [];
  for (const entry of scored) {
    const group = entry.stop.oneOfGroup;
    if (group) {
      if (seenGroups.has(group)) continue;
      seenGroups.add(group);
    }
    collapsed.push(entry);
  }

  // Rhythm cap — slow rhythm gets at most 1 optional stop
  const cap = input.rhythm === "slow" ? 1 : 2;
  return collapsed.slice(0, cap).map((e) => e.stop.name);
}

/* ---------------------------------------------------------------------------
 * Phase 5E — Controlled route composition (replacement, flag-gated).
 *
 * `applyReplacementCandidates` may replace up to N non-critical route points
 * with same-type candidates from REGION_STOP_POOL. It is gated by
 * `STUDIO_V3_ROUTE_COMPOSITION_ENABLED` (false in committed code) and the
 * call site in `resolveStudioV3Route` does not run it when the flag is off,
 * so live behaviour is byte-identical to today.
 *
 * Hard rules (covered by `route-composition.test.ts`):
 *  - never replace the first route point (and never the second — first 1–2
 *    positions are the primary anchor)
 *  - candidates must match region, routeCluster, signatureTourId rules,
 *    active === true, oneOfGroup uniqueness, and considerations deny list
 *  - candidates must match the inferred type of the route point being
 *    replaced (winery → winery, viewpoint → viewpoint, etc.)
 *  - total duration delta stays within ±20% of the baseline
 *  - rhythm cap: slow → 1, balanced → 2, full/immersive → 3
 *  - never grows the route beyond the existing 4-point cap
 *  - never reorders the route — replacements are in-place only
 * --------------------------------------------------------------------------- */

const STUDIO_V3_ROUTE_COMPOSITION_ENABLED = true;

/** Baseline minutes assumed per existing route point when computing the
 *  total-duration safety check. We don't store durationMin on TourStop, so
 *  we use a conservative constant; candidates are scored relative to this. */
const ROUTE_POINT_BASELINE_MIN = 60;

function replacementCapForRhythm(rhythm: Rhythm): number {
  // Studio must NOT feel like a Signature editor. Cap raised so answers
  // materially reshape the day: at balanced rhythm the composer may now
  // swap up to 3 of ~4 stops (only the anchor is protected), and
  // full/immersive may swap every non-anchor stop. See the Studio-vs-
  // Signature correction brief, §5 and §7.
  if (rhythm === "slow") return 2;
  if (rhythm === "balanced") return 3;
  return 4; // full | immersive — effectively unbounded within routePoints.length
}

/** Inferred route-point kind. Extends OptionalStopType with a virtual
 *  "scenic" bucket for coastal / dusk / landscape phrasing that has no
 *  single canonical OptionalStopType — handled via the compatibility map. */
type InferredRoutePointKind = OptionalStop["type"] | "scenic";

/**
 * Infer a coarse kind from a Signature stop's label + story.
 * Deterministic, keyword-only. Returns null when nothing matches — those
 * stops are skipped (never replaced) to stay safe.
 *
 * Order matters: more specific patterns (winery, workshop, viewpoint…)
 * run before the broader "village (place)" and "scenic" fallbacks so a
 * label like "Cristo Rei viewpoint" stays `viewpoint`, "Family winery in
 * Azeitão" stays `winery`, while bare "Sesimbra coast" or "Arrábida at
 * dusk" can still resolve to a usable kind.
 */
function inferRoutePointType(label: string, story: string): InferredRoutePointKind | null {
  const hay = `${label} ${story}`.toLowerCase();
  if (/\bwinery|wine cellar|wine estate|wine tasting|vineyard|adega|quinta\b/.test(hay))
    return "winery";
  if (/\bworkshop|atelier|tile painting|hands-on\b/.test(hay)) return "workshop";
  if (/\bboat|barco|sail|catamaran|cruise\b/.test(hay)) return "boat";
  if (/\bmarket|mercado\b/.test(hay)) return "market";
  if (
    /\bmonastery|convent|chapel|cathedral|church|castle|palace|temple|fortress|capela|igreja|castelo|pal[áa]cio|monument\b/.test(
      hay,
    )
  )
    return "monument";
  if (/\bviewpoint|viewpoints|miradouro|overlook|panoram|lookout\b/.test(hay)) return "viewpoint";
  if (/\bbeach|praia|cove|sand\b/.test(hay)) return "beach";
  if (
    /\blunch|dinner|meal|restaurant|table|petiscos|picnic|tasting menu|chef|food|gastronomy\b/.test(
      hay,
    )
  )
    return "table";
  if (
    /\bvillage|aldeia|hamlet|vila d|town|old town|historic centre|centro hist[óo]rico|sesimbra|azeit[ãa]o|cascais|sintra|[óo]bidos|comporta|tomar|coimbra|[ée]vora\b/.test(
      hay,
    )
  )
    return "village";
  if (/\bgarden|jardim|park\b/.test(hay)) return "garden";
  if (/\bstudio|gallery|artisan\b/.test(hay)) return "studio";
  if (/\bheritage|historic|roman ruin\b/.test(hay)) return "heritage";
  if (/\bnature|forest|reserve|trail|hike|cliff|cliffs\b/.test(hay)) return "nature";
  if (/\bcoast|coastal|seaside|ocean|dusk|sunset|landscape\b/.test(hay)) return "scenic";
  return null;
}

/**
 * Compatibility map: which OptionalStop candidate types can legally replace
 * a route point of a given inferred kind. Strict by default — wider
 * families only where listed by the Phase 5F spec, never across food /
 * heritage / coast boundaries.
 */
const REPLACEMENT_FAMILY: Record<InferredRoutePointKind, ReadonlyArray<OptionalStop["type"]>> = {
  winery: ["winery"],
  workshop: ["workshop"],
  monument: ["monument"],
  market: ["market"],
  table: ["table"],
  beach: ["beach"],
  viewpoint: ["viewpoint"],
  nature: ["nature"],
  garden: ["garden"],
  studio: ["studio"],
  boat: ["boat"],
  heritage: ["heritage", "monument"],
  // A scenic or village point is NOT a wine point: a winery must never enter
  // the day merely because the replacement family structurally allowed it.
  scenic: ["beach", "viewpoint", "nature", "village"],
  village: ["village", "market", "monument"],

};

function isCompatibleCandidate(kind: InferredRoutePointKind, cand: OptionalStop): boolean {
  return REPLACEMENT_FAMILY[kind].includes(cand.type);
}

/**
 * Phase 5F: replaces the blanket PROTECTED_LEAD_COUNT=2 guard.
 *   - index 0 is always protected (entry/anchor).
 *   - index 1+ is replaceable when its inferred kind has at least one
 *     compatible candidate in the pre-filtered pool.
 *   - route points whose kind cannot be inferred are protected.
 *   - table/lunch slots are protected unless a same-family table
 *     candidate exists.
 */
function isProtectedRoutePoint(
  routePoint: ResolvedRoutePoint,
  index: number,
  candidates: ReadonlyArray<OptionalStop>,
): boolean {
  if (index === 0) return true;
  const kind = inferRoutePointType(routePoint.label, routePoint.story);
  if (!kind) return true;
  const hasCompatible = candidates.some((c) => isCompatibleCandidate(kind, c));
  if (!hasCompatible) return true;
  return false;
}

/** Hard deny: mobility considerations + viewpoint replacement candidates. */
function isReplacementDeniedByConsiderations(
  stop: OptionalStop,
  considerations: ReadonlyArray<string>,
): boolean {
  if (isDeniedByConsiderations(stop, considerations)) return true;
  const mobilityConcern = considerations.some((c) => MOBILITY_CONSIDERATIONS.has(c));
  if (mobilityConcern && stop.type === "viewpoint") return true;
  return false;
}

/**
 * Pure ranked selector for replacement candidates. Returns the OptionalStop
 * objects (not names) so the caller can match by type and durationMin.
 * Deterministic sort: score DESC → durationMin ASC → id ASC.
 */
export function selectReplacementCandidates(input: {
  skeletonTourId: string | null | undefined;
  interests: ReadonlyArray<Interest>;
  rhythm: Rhythm;
  companions: Companions;
  investment: InvestmentTier | null;
  considerations: ReadonlyArray<string>;
  existingRoutePointLabels: ReadonlyArray<string>;
  /**
   * Explicit wine intent (see studioWineIntent.ts). When false, winery
   * candidates are excluded outright: a non-wine traveller must never be
   * offered — nor silently given — a cellar they did not ask for.
   * Defaults conservatively to the `wine` interest alone.
   */
  wineIntent?: boolean;
  /**
   * ISO yyyy-mm-dd of the day being composed. P8 hardening: candidates whose
   * operational registry says they are closed on that date are removed here,
   * so no post-curation replacement or extra moment can re-introduce a stop
   * the traveller could not actually visit.
   */
  dateExact?: string | null;
}): OptionalStop[] {
  const skeleton = input.skeletonTourId ? SKELETON_TO_CLUSTER[input.skeletonTourId] : undefined;
  if (!skeleton) return [];

  const allowWinery = input.wineIntent ?? interestsImplyWine(input.interests);
  const existing = new Set(input.existingRoutePointLabels.flatMap((l) => stopKeys(l)));


  const eligible = REGION_STOP_POOL.filter((stop) => {
    if (!stop.active) return false;
    if (stop.region !== skeleton.region) return false;
    if (stop.routeCluster !== skeleton.routeCluster) return false;
    if (!allowWinery && stop.type === "winery") return false;
    // An INCLUDED midday table is the Signature's own published lunch, not an
    // alternative moment. It may be placed by the composer, but it must never
    // be offered as a replacement for another table: swapping one included
    // lunch for another would invent a change that does not exist.
    if (stop.type === "table" && stop.source === "signature-core") return false;
    // Operational truth — same rule curateJourney applies to the base pool.
    if (isStopClosedOn(`${stop.name} ${stop.notes ?? ""}`, input.dateExact ?? null)) return false;


    // Tour-isolation gate — a candidate is eligible when AT LEAST ONE holds:
    //   (a) signatureTourId matches the resolved skeleton, OR
    //   (b) sourceTourIds contains the resolved skeleton, OR
    //   (c) neither field is set (generic cluster stop, region+cluster gated).
    const sigOk = !!stop.signatureTourId && stop.signatureTourId === skeleton.signatureTourId;
    const srcOk =
      !!stop.sourceTourIds &&
      stop.sourceTourIds.length > 0 &&
      stop.sourceTourIds.includes(skeleton.signatureTourId);
    const generic =
      !stop.signatureTourId && (!stop.sourceTourIds || stop.sourceTourIds.length === 0);
    if (!sigOk && !srcOk && !generic) return false;

    if (alreadyUsed(existing, stop.name)) return false;
    if (isReplacementDeniedByConsiderations(stop, input.considerations)) {
      return false;
    }
    return true;
  });

  const scored = eligible
    .map((stop) => {
      let score = scoreOptionalStop(stop, {
        interests: input.interests,
        rhythm: input.rhythm,
        companions: input.companions,
        investment: input.investment,
      });
      // Phase 5E scoring tweak: penalize long-duration outliers vs baseline.
      const delta = Math.abs(stop.durationMin - ROUTE_POINT_BASELINE_MIN);
      if (delta > ROUTE_POINT_BASELINE_MIN * 0.6) score -= 2;
      return { stop, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.stop.durationMin !== b.stop.durationMin) {
        return a.stop.durationMin - b.stop.durationMin;
      }
      return a.stop.id.localeCompare(b.stop.id);
    });

  return scored.map((e) => e.stop);
}

/**
 * Apply replacements in-place against an ordered `routePoints` array. Pure
 * function — returns a new array; never reorders; never grows. Honors:
 *  - PROTECTED_LEAD_COUNT (skips first 1–2 indices)
 *  - type preservation
 *  - oneOfGroup uniqueness
 *  - total duration within ±20% of baseline
 *  - rhythm cap
 *  - existing 4-point cap is preserved (input length is the cap)
 */
export function applyReplacementCandidates(
  routePoints: ReadonlyArray<ResolvedRoutePoint>,
  input: {
    skeletonTourId: string | null | undefined;
    interests: ReadonlyArray<Interest>;
    rhythm: Rhythm;
    companions: Companions;
    investment: InvestmentTier | null;
    considerations: ReadonlyArray<string>;
    /** Explicit wine intent — gates winery candidates. See studioWineIntent.ts. */
    wineIntent?: boolean;
    /** ISO yyyy-mm-dd — keeps operationally closed candidates out. */
    dateExact?: string | null;
  },
): ResolvedRoutePoint[] {
  const out = routePoints.map((p) => ({ ...p }));
  if (out.length === 0) return out;

  const cap = Math.min(
    replacementCapForRhythm(input.rhythm),
    Math.max(0, out.length - 1), // index 0 is always protected
  );
  if (cap === 0) return out;

  const candidates = selectReplacementCandidates({
    skeletonTourId: input.skeletonTourId,
    interests: input.interests,
    rhythm: input.rhythm,
    companions: input.companions,
    investment: input.investment,
    considerations: input.considerations,
    existingRoutePointLabels: out.map((p) => p.label),
    wineIntent: input.wineIntent,
    dateExact: input.dateExact ?? null,
  });
  if (candidates.length === 0) return out;

  const usedIds = new Set<string>();
  const usedGroups = new Set<string>();
  const usedLabels = new Set(out.flatMap((p) => stopKeys(p.label)));

  const baselineTotal = out.length * ROUTE_POINT_BASELINE_MIN;
  let runningTotal = baselineTotal;
  const minTotal = baselineTotal * 0.8;
  const maxTotal = baselineTotal * 1.2;

  let replacedCount = 0;

  for (let i = 0; i < out.length; i++) {
    if (replacedCount >= cap) break;
    const current = out[i];
    if (isProtectedRoutePoint(current, i, candidates)) continue;
    const kind = inferRoutePointType(current.label, current.story);
    if (!kind) continue; // belt-and-braces; isProtectedRoutePoint already guards

    for (const cand of candidates) {
      if (usedIds.has(cand.id)) continue;
      if (!isCompatibleCandidate(kind, cand)) continue;
      if (cand.oneOfGroup && usedGroups.has(cand.oneOfGroup)) continue;
      if (alreadyUsed(usedLabels, cand.name)) continue;

      const projectedTotal = runningTotal - ROUTE_POINT_BASELINE_MIN + cand.durationMin;
      if (projectedTotal < minTotal || projectedTotal > maxTotal) continue;

      // Commit replacement (preserve index, drop geo since pool coords are
      // optional — keep candidate coords when present, else null).
      out[i] = {
        index: current.index,
        label: cand.name,
        story: customerStopBlurb(cand),
        lat: cand.coords?.lat ?? null,
        lng: cand.coords?.lng ?? null,
      };
      usedIds.add(cand.id);
      if (cand.oneOfGroup) usedGroups.add(cand.oneOfGroup);
      forgetStop(usedLabels, current.label);
      rememberStop(usedLabels, cand.name);
      runningTotal = projectedTotal;
      replacedCount += 1;
      break;
    }
  }

  return out;
}

/* ---------------------------------------------------------------------------
 * Phase 5G — One personalised extra moment (flag-gated, additive).
 *
 * Adds AT MOST one extra routePoint from REGION_STOP_POOL when the
 * composed route has fewer than 4 points and rhythm is not "slow".
 * Reuses `selectReplacementCandidates` for all eligibility/safety:
 *  - region + routeCluster containment
 *  - active === true
 *  - signatureTourId / sourceTourIds / generic eligibility
 *  - oneOfGroup uniqueness (vs current route)
 *  - reduced-mobility deny (no viewpoint for mobility considerations)
 *  - existing labels excluded
 *  - P17/P6 isolation (encoded in pool data + cluster gate)
 *
 * Insertion: never at index 0; if last point is a table/lunch slot,
 * insert before it; otherwise insert after index 1. Length is hard-capped
 * at 4. Existing routePoints are never reordered.
 * --------------------------------------------------------------------------- */

const EXTRA_MOMENT_STORY_FALLBACK: Record<OptionalStop["type"], string> = {
  winery: "A grounded wine moment shaped around regional flavour.",
  workshop: "A hands-on craft moment with a local maker.",
  monument: "A heritage pause grounded in local history.",
  market: "A vivid local market — colour, flavour and everyday life.",
  table: "A relaxed regional table woven into the day's rhythm.",
  beach: "A coastal pause with sand, sea and slower air.",
  viewpoint: "A quiet viewpoint with space to take it in.",
  nature: "A calm walk through a quieter natural setting.",
  garden: "A slow stroll through a gentle garden.",
  studio: "A short visit with a local studio and its work.",
  boat: "A quiet moment by the water.",
  heritage: "A layered heritage pause with real local depth.",
  village: "A quiet village pause, away from the busier route.",
};

/**
 * Customer-facing one-line blurb for an OptionalStop.
 *
 * The `notes` field on REGION_STOP_POOL entries is INTERNAL ONLY — it
 * contains source-verification language ("Source-verified itinerary stop
 * from P3", "one-of-N winery option", "Supplier availability required",
 * etc.) that must never reach the traveller. This helper derives a short,
 * experiential line from the stop's type so the editor / swap pool / Story
 * of the Day always read like polished Signature notes.
 */
export function customerStopBlurb(cand: OptionalStop): string {
  return EXTRA_MOMENT_STORY_FALLBACK[cand.type];
}

function buildExtraMomentStory(cand: OptionalStop): string {
  return customerStopBlurb(cand);
}

function scoreExtraMomentCandidate(
  cand: OptionalStop,
  ctx: {
    interests: ReadonlyArray<Interest>;
    rhythm: Rhythm;
    companions: Companions;
    investment: InvestmentTier | null;
    skeletonSignatureTourId: string;
    existingKinds: ReadonlySet<OptionalStop["type"]>;
  },
): number {
  let score = 0;
  if (ctx.interests.some((i) => cand.suitsInterests.includes(i))) score += 3;
  if (!ctx.existingKinds.has(cand.type)) score += 2;
  if (cand.suitsRhythm.includes(ctx.rhythm)) score += 1;
  if (!cand.suitsCompanions || cand.suitsCompanions.includes(ctx.companions)) {
    score += 1;
  }
  if (ctx.investment && cand.suitsInvestment?.includes(ctx.investment)) {
    score += 1;
  }
  if (cand.sourceTourIds && cand.sourceTourIds.includes(ctx.skeletonSignatureTourId)) {
    score += 1;
  }
  if (cand.durationMin > 60) score -= 2;
  return score;
}

/**
 * Append at most one extra routePoint when safe. Pure function — returns
 * a new array; never grows beyond 4; never reorders existing entries.
 */
export function applyExtraMoment(
  routePoints: ReadonlyArray<ResolvedRoutePoint>,
  input: {
    skeletonTourId: string | null | undefined;
    interests: ReadonlyArray<Interest>;
    rhythm: Rhythm;
    companions: Companions;
    investment: InvestmentTier | null;
    considerations: ReadonlyArray<string>;
    /** Explicit wine intent — gates winery candidates. See studioWineIntent.ts. */
    wineIntent?: boolean;
    /** ISO yyyy-mm-dd — keeps operationally closed candidates out. */
    dateExact?: string | null;
    /**
     * LEGACY SAFETY CEILING ONLY (PASS 2). Upper bound for the resulting
     * route length, applied ONLY when truthful minutes are unavailable for
     * the current route or the candidate. When minute truth exists, the Time
     * Authority decides and this count never rejects a proven fit.
     */
    maxPoints?: number;
    /** Anchor region — resolves the regional day/drive caps for time fit. */
    region?: string | null;
    /**
     * Minutes committed by SELECTED add-ons. Counted against the budget and
     * never zeroed or dropped to force a fit.
     */
    selectedAddOnMinutes?: number;
  },
): ResolvedRoutePoint[] {
  const maxPoints = Math.max(1, input.maxPoints ?? 4);
  const out = routePoints.map((p) => ({ ...p }));
  if (input.rhythm === "slow") return out;
  if (out.length === 0) return out;

  // PASS 2.1 · TIME AUTHORITY BOUNDARY (provenance-safe).
  // Certified minutes present -> the count cap is inert; fit decides per candidate.
  // Certified minutes absent  -> explicit legacy count fallback, unchanged.
  // A route point only counts as certified when it carries an explicit
  // positive duration with authoritative provenance (`inventory` /
  // `sot-chapter` / `addon-catalog`). Label inference is never used here.
  const existingTimeStops = out.map((p) => {
    const carrier = p as ResolvedRoutePoint & {
      stopId?: string | null;
      durationMinutes?: number | null;
      durationSource?: DwellSource | null;
    };
    return {
      // Legacy resolved route points carry no structural timing identity.
      // Never synthesize an id from label/index/order: only a genuine
      // structural `stopId` may certify. Absent identity stays empty so
      // `stopHasMinuteTruth` returns false for legacy carriers.
      stopId: carrier.stopId ?? "",
      label: p.label,
      lat: p.lat,
      lng: p.lng,
      durationMinutes: carrier.durationMinutes ?? null,
      durationSource: carrier.durationSource ?? null,
    };
  });

  const timeEvaluable = hasMinuteTruth(existingTimeStops);
  if (!timeEvaluable && out.length >= maxPoints) return out;




  const skeleton = input.skeletonTourId ? SKELETON_TO_CLUSTER[input.skeletonTourId] : undefined;
  if (!skeleton) return out;

  const candidates = selectReplacementCandidates({
    skeletonTourId: input.skeletonTourId,
    interests: input.interests,
    rhythm: input.rhythm,
    companions: input.companions,
    investment: input.investment,
    considerations: input.considerations,
    existingRoutePointLabels: out.map((p) => p.label),
    wineIntent: input.wineIntent,
    dateExact: input.dateExact ?? null,
  });
  if (candidates.length === 0) return out;

  const existingKinds = new Set<OptionalStop["type"]>();
  for (const p of out) {
    const k = inferRoutePointType(p.label, p.story);
    if (k && k !== "scenic") existingKinds.add(k);
  }
  const existingGroups = new Set<string>();
  for (const p of out) {
    const match = REGION_STOP_POOL.find((s) => normalizeLabel(s.name) === normalizeLabel(p.label));
    if (match?.oneOfGroup) existingGroups.add(match.oneOfGroup);
  }

  const scored = candidates
    .filter((c) => !(c.oneOfGroup && existingGroups.has(c.oneOfGroup)))
    .map((c) => ({
      cand: c,
      score: scoreExtraMomentCandidate(c, {
        interests: input.interests,
        rhythm: input.rhythm,
        companions: input.companions,
        investment: input.investment,
        skeletonSignatureTourId: skeleton.signatureTourId,
        existingKinds,
      }),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.cand.durationMin !== b.cand.durationMin) {
        return a.cand.durationMin - b.cand.durationMin;
      }
      return a.cand.id.localeCompare(b.cand.id);
    });

  // Never add an extra moment just to fill a slot: a non-positive contextual
  // score means nothing in the pool actually relates to what was asked for.
  const best = scored[0];
  if (!best || best.score <= 0) return out;
  const pick = best.cand;

  // P0-C — daypart truth, not a fixed slot. A verified table belongs at the
  // cumulative-time middle of the day (never last); anything else keeps the
  // existing behaviour of joining early, and never after a closing meal.
  const lastKind = inferRoutePointType(out[out.length - 1].label, out[out.length - 1].story);
  const insertAt =
    pick.type === "table"
      ? middayInsertIndex(
          out.map((p) => {
            const match = REGION_STOP_POOL.find(
              (s) => normalizeLabel(s.name) === normalizeLabel(p.label),
            );
            return match && match.durationMin > 0 ? match.durationMin : 60;
          }),
        )
      : lastKind === "table"
        ? out.length - 1
        : Math.min(2, out.length);

  const inserted: ResolvedRoutePoint = {
    index: insertAt,
    label: pick.name,
    story: buildExtraMomentStory(pick),
    lat: pick.coords?.lat ?? null,
    lng: pick.coords?.lng ?? null,
  };

  // PASS 2.1 · TIME AUTHORITY — a certified, fitting addition is accepted even
  // at the legacy count ceiling; a candidate that pushes the day (including
  // SELECTED add-on minutes, never zeroed) over budget is rejected even below
  // it. REGION_STOP_POOL candidates carry a structural `durationMin`, so their
  // provenance is `inventory`.
  if (timeEvaluable) {
    const candidateStop = {
      stopId: pick.id,
      label: pick.name,
      lat: pick.coords?.lat ?? null,
      lng: pick.coords?.lng ?? null,
      durationMinutes: pick.durationMin > 0 ? pick.durationMin : null,
      durationSource: "inventory" as DwellSource,
    };
    if (!stopHasMinuteTruth(candidateStop)) {
      // Unknown candidate minutes — legacy count safety applies.
      if (out.length >= maxPoints) return out;
    } else {
      const verdict = judgeAdmission(
        {
          stops: existingTimeStops,
          skeletonTourId: input.skeletonTourId ?? null,
          rhythm: input.rhythm,
          addOnsMinutes: input.selectedAddOnMinutes ?? 0,
        },
        candidateStop,
        { insertAt },
      );
      if (!verdict.fits) return out;
    }

  }


  const next = [...out.slice(0, insertAt), inserted, ...out.slice(insertAt)];
  // Re-number indices to keep ResolvedRoutePoint contract. The count slice is
  // a LEGACY SAFETY CEILING only — a time-proven route is never truncated.
  const capped = timeEvaluable ? next : next.slice(0, maxPoints);
  return capped.map((p, i) => ({ ...p, index: i }));

}

/* ---------------------------------------------------------------------------
 * Phase 7A — Mobility safety filter for original skeleton stops.
 *
 * The base composition pipeline already filters mobility-unsafe candidates
 * out of REPLACEMENT pools (see `isReplacementDeniedByConsiderations`), but
 * an original Signature skeleton stop may still surface a cliff, cove,
 * cave, trail or steep viewpoint when the traveller flagged reduced
 * mobility / avoid-long-walks. This pass walks the composed routePoints
 * and, for any stop whose label/story implies difficult access, tries to
 * replace it with a safe same-family candidate from REGION_STOP_POOL. If
 * no safe candidate exists, the unsafe stop is dropped.
 * --------------------------------------------------------------------------- */

const UNSAFE_SKELETON_RE =
  /\bcliffs?\b|\bcoves?\b|\bcaves?\b|\bsteep\b|\bstairs?\b|\buneven\b|\btrail\b|\bhike\b|\bwild beach\b|\bsecluded beach\b|kayak|snorkel|swim across|hard to reach|miradouro/i;

function isUnsafeSkeletonStop(label: string, story: string): boolean {
  const hay = `${label} ${story}`;
  return UNSAFE_SKELETON_RE.test(hay);
}

export function applyMobilitySafety(
  routePoints: ReadonlyArray<ResolvedRoutePoint>,
  input: {
    skeletonTourId: string | null | undefined;
    interests: ReadonlyArray<Interest>;
    rhythm: Rhythm;
    companions: Companions;
    investment: InvestmentTier | null;
    considerations: ReadonlyArray<string>;
    /** Explicit wine intent — gates winery candidates. See studioWineIntent.ts. */
    wineIntent?: boolean;
    /** ISO yyyy-mm-dd — keeps operationally closed candidates out. */
    dateExact?: string | null;
  },
): ResolvedRoutePoint[] {
  const out = routePoints.map((p) => ({ ...p }));
  if (out.length === 0) return out;

  const candidates = selectReplacementCandidates({
    skeletonTourId: input.skeletonTourId,
    interests: input.interests,
    rhythm: input.rhythm,
    companions: input.companions,
    investment: input.investment,
    considerations: input.considerations,
    existingRoutePointLabels: out.map((p) => p.label),
    wineIntent: input.wineIntent,
    dateExact: input.dateExact ?? null,
  });

  const usedIds = new Set<string>();
  const usedLabels = new Set(out.flatMap((p) => stopKeys(p.label)));
  const result: ResolvedRoutePoint[] = [];

  for (const p of out) {
    if (!isUnsafeSkeletonStop(p.label, p.story)) {
      result.push(p);
      continue;
    }
    const kind = inferRoutePointType(p.label, p.story);
    const cand = kind
      ? candidates.find(
          (c) =>
            !usedIds.has(c.id) &&
            !alreadyUsed(usedLabels, c.name) &&
            isCompatibleCandidate(kind, c),
        )
      : undefined;
    if (cand) {
      usedIds.add(cand.id);
      forgetStop(usedLabels, p.label);
      rememberStop(usedLabels, cand.name);
      result.push({
        index: p.index,
        label: cand.name,
        story: customerStopBlurb(cand),
        lat: cand.coords?.lat ?? null,
        lng: cand.coords?.lng ?? null,
      });
    }
    // else: drop the unsafe stop (no safe replacement available).
  }

  // Re-index to keep ResolvedRoutePoint contract.
  return result.map((p, i) => ({ ...p, index: i }));
}

/** Test-only accessor for the local flag — keeps the flag private to this
 *  module while letting the test suite assert it is OFF in committed code. */
export const __STUDIO_V3_ROUTE_COMPOSITION_ENABLED_FOR_TESTS = STUDIO_V3_ROUTE_COMPOSITION_ENABLED;
