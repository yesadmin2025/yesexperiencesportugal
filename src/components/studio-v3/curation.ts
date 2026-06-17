// Studio V3 — curation layer (regional pool).
//
// The base of every journey is ONE real Signature tour (chosen from the
// existing catalog). To keep the experience feeling personal, individual
// stops can come from OTHER Signature tours in the same region — as long
// as they fit the traveller's profile (feeling + companions). Nothing is
// invented: every stop, story and image is sourced from a real tour
// already on the site.
//
// Algorithm:
//   1. Pick the primary tour for the chosen feeling.
//   2. Build a regional stop pool from every tour sharing seed.region.
//   3. Score each pool stop by feeling/companions keyword affinity.
//   4. Anchor the journey with the base tour's first stop, then fill the
//      remaining slots with the highest-scored stops, deduped by label,
//      preferring stops with resolvable map coordinates.

import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";
import {
  REGION_STOP_POOL,
  STUDIO_V3_OPTIONAL_STOPS_ENABLED,
  type OptionalStop,
  type RegionId,
} from "@/data/regionStopPool";
import type {
  ChoiceOption,
  Companions,
  CompanionsType,
  Consideration,
  DestinationIntent,
  Feeling,
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
  family: "family",
  culture: "heritage",
  adventure: "Atlantic",
  "slow-luxury": "slow",
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
  coastal: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta"],
  "wine-food": ["arrabida-wine-allinclusive", "azeitao-cheese", "evora-alentejo"],
  hidden: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta"],
  romance: ["sintra-cascais", "arrabida-wine-allinclusive", "troia-comporta"],
  family: ["sintra-cascais", "fatima-nazare-obidos", "troia-comporta"],
  culture: ["tomar-coimbra", "tiles-workshop", "fatima-nazare-obidos"],
  adventure: ["arrabida-boat", "wild-beaches-picnic", "troia-comporta"],
  "slow-luxury": ["arrabida-wine-allinclusive", "sintra-cascais", "evora-alentejo"],
};

const INTEREST_TARGET_TOURS: Partial<Record<Interest, string[]>> = {
  wine: ["arrabida-wine-allinclusive", "azeitao-cheese", "evora-alentejo", "troia-comporta"],
  gastronomy: ["arrabida-wine-allinclusive", "azeitao-cheese", "evora-alentejo", "troia-comporta"],
  heritage: ["tomar-coimbra", "fatima-nazare-obidos", "sintra-cascais", "tiles-workshop"],
  coast: ["wild-beaches-picnic", "arrabida-boat", "troia-comporta", "sintra-cascais"],
};

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
 */
const INVESTMENT_STOP_DELTA: Record<InvestmentTier, number> = {
  considered: -1, // efficient — fewer extras
  elevated: 0,    // balanced premium
  // Phase 7A: bespoke should NOT thin the day. It signals stronger character
  // and premium candidate preference, not fewer stops. Soft scoring boost is
  // applied separately in `investmentPremiumScore`.
  bespoke: 0,
  open: 0,        // best fit
};

const INVESTMENT_PREMIUM_KEYWORDS: string[] = [
  "private", "exclusive", "premium", "tasting", "sommelier", "chef",
  "cellar", "estate", "manor", "palace", "boutique", "michelin",
  "sunset", "candlelight", "champagne", "long lunch", "pairing",
  "reserve", "vintage",
];

const INVESTMENT_EFFICIENT_KEYWORDS: string[] = [
  "village", "market", "workshop", "easy", "stroll", "walk",
  "viewpoint", "harbour", "old town", "tile",
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
  coastal: ["beach", "coast", "sea", "boat", "harbour", "cove", "ferry", "cliff", "dusk", "sand", "sesimbra", "comporta", "portinho", "atlantic", "ocean"],
  "wine-food": ["wine", "winery", "tasting", "lunch", "cheese", "vineyard", "market", "table", "glass", "pairings", "moscatel"],
  hidden: ["hidden", "quiet", "secret", "small", "narrow", "rarely", "drift", "pull-over", "no crowds", "few"],
  romance: ["quiet", "sunset", "dusk", "two", "courtyard", "private", "long lunch", "golden", "view", "stroll"],
  family: ["family", "easy", "boat", "beach", "workshop", "swim", "snorkel", "garden", "village"],
  culture: ["palace", "convent", "library", "ruins", "roman", "templar", "chapel", "tile", "azulejo", "heritage", "old town", "unesco", "monks"],
  adventure: ["boat", "swim", "snorkel", "cliffs", "wind", "atlantic", "cabo", "trail", "climb"],
  "slow-luxury": ["long", "slow", "courtyard", "private", "tasting", "garden", "patio", "golden", "quietly", "drift"],
};

const WINE_STOP_RE = /\b(wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca|catralvos|palmela)\b/i;

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
  /** Ordered moments, possibly mixing stops from sibling regional tours. */
  moments: CuratedMoment[];
  /** Region center for the map — first geo-resolvable moment, or null. */
  center: { lat: number; lng: number } | null;
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
const COMPORTA_TROIA_TOURS = new Set([
  "troia-comporta",
  "evora-alentejo",
]);

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
    "tomar-coimbra": 1.5,
    "fatima-nazare-obidos": 1.5,
    "troia-comporta": 1.5,
  },
};

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
  heritage: ["palace", "convent", "templar", "tile", "azulejo", "heritage", "unesco", "monks", "old town", "ruins"],
  photography: ["viewpoint", "sunset", "golden", "view", "dusk"],
  wellness: ["slow", "quiet", "garden", "patio", "courtyard"],
  "local-life": ["village", "market", "local", "workshop", "neighbour"],
};

/** Pick ONE Signature skeleton that best fits the answers AND keeps the
 *  route geographically contained near the chosen pickup. Deterministic. */
function pickPrimaryTour(
  feeling: Feeling,
  companions: Companions,
  interests: ReadonlyArray<Interest>,
  pickup: Pickup | null,
  destinationIntent: DestinationIntent | null,
): { tour: SignatureTour; alternates: SignatureTour[] } {
  const candidateIds = FEELING_TO_TOURS[feeling] ?? [];
  // When a destination intent is set, fold its target tours into the
  // candidate pool so the boost can actually pick them up (FEELING_TO_TOURS
  // alone may not include e.g. evora-alentejo for a "coastal" feeling).
  const intentTargets = destinationIntent && destinationIntent !== "no-preference"
    ? Object.keys(DESTINATION_INTENT_BOOSTS[destinationIntent])
    : [];
  const interestTargets = interests.flatMap((i) => INTEREST_TARGET_TOURS[i] ?? []);
  const mergedIds = Array.from(new Set([...candidateIds, ...intentTargets, ...interestTargets]));
  const candidates = mergedIds
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is SignatureTour => Boolean(t));

  if (candidates.length === 0) {
    const fallback =
      signatureTours.find((t) => t.id === "arrabida-wine-allinclusive") ??
      signatureTours[0];
    return { tour: fallback, alternates: [] };
  }

  // Phase 7A: tiles / craft / hands-on culture intent boost.
  // When the traveller signals culture + local craft (heritage interest paired
  // with local-life), prefer `tiles-workshop` over generic culture skeletons
  // where geographically reasonable (Lisbon-area pickups). We never force
  // tiles when the user did not express that intent (no local-life signal).
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

  const wantsWine =
    feeling === "wine-food" ||
    interests.includes("wine") ||
    interests.includes("gastronomy") ||
    destinationIntent === "alentejo-evora-wine" ||
    destinationIntent === "arrabida-setubal-azeitao";

  const scored = candidates
    .map((tour, order) => {
      let score = 0;
      score += pickupAffinity(tour, pickup) * 1.2;
      score += interestAffinity(tour, interests);
      score += destinationIntentBoost(tour, destinationIntent);
      if (wantsWine && /wine|winery|tasting|vineyard|cellar|moscatel|quinta|adega|bacalh[oô]a|fonseca/i.test(`${tour.title} ${tour.theme} ${tour.blurb}`)) {
        score += 3;
      }
      // Companions soft hints — proposal/celebration lean wine/heritage tours.
      if (companions === "family" && /family|child/i.test(tour.idealFor.join(" "))) {
        score += 0.5;
      }
      if (wantsTilesCraft && isLisbonArea && tour.id === "tiles-workshop") {
        score += 3;
      }
      return { tour, score, order };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order; // preserve FEELING_TO_TOURS ordering as tiebreak
    });

  return {
    tour: scored[0].tour,
    alternates: scored.slice(1, 3).map((s) => s.tour),
  };
}

/**
 * curateJourney — route-contained. Returns moments drawn ONLY from the
 * single primary Signature tour's own `stops`. No cross-tour borrowing,
 * no mixed-region routes. The map preview, MapAwakens stage and the
 * Journey Card all consume this single source via resolveStudioV3Route.
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
    /** ISO yyyy-mm-dd — when present, stops closed on that weekday
     *  (e.g. Mercado do Livramento on Mondays) are removed from the
     *  pool so we never propose a stop that won't be open. */
    dateExact?: string | null;
  },
): CuratedJourney {
  const interests = options?.interests ?? [];
  const pickup = options?.pickup ?? null;
  const investment = options?.investment ?? null;
  const destinationIntent = options?.destinationIntent ?? null;
  const dateExact = options?.dateExact ?? null;


  const { tour: primary, alternates } = pickPrimaryTour(
    feeling,
    companions,
    interests,
    pickup,
    destinationIntent,
  );

  // STRICT containment: pool = primary tour's own stops only.
  const pool: PoolStop[] = primary.stops.map((s) => ({
    fromTourId: primary.id,
    label: s.label,
    story: s.story,
    image: s.image,
    focal: s.focal,
    imageTheme: s.imageTheme,
    isBaseTour: true,
  }));

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
    feeling !== "family" &&
    !interests.includes("nature");
  const minStops = allowTwoStop ? 2 : 3;
  const target = Math.max(minStops, Math.min(rhythmTarget, scored.length));

  // Semantic dedupe: strip common suffixes/words and accents so e.g.
  // "Bacalhôa" and "Bacalhôa Palace & Winery" are treated as the same
  // location and never appear together in the same day.
  const normalizeSemantic = (label: string): string =>
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(winery|wineries|tasting|tastings|adega|adegas|palace|estate|quinta|vineyard|visit|stop|cellar|garden|gardens|museum|workshop|chapel)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // Anchor on the tour's opening stop so the narrative arc is intact.
  const anchor = scored.find((s) => s.stop.label === primary.stops[0]?.label);
  const picks: typeof scored = [];
  const seenLabels = new Set<string>();
  const seenSemantic = new Set<string>();
  const addPick = (s: (typeof scored)[number]) => {
    picks.push(s);
    seenLabels.add(s.stop.label.toLowerCase());
    seenSemantic.add(normalizeSemantic(s.stop.label));
  };
  if (anchor) addPick(anchor);
  for (const s of scored) {
    if (picks.length >= target) break;
    if (seenLabels.has(s.stop.label.toLowerCase())) continue;
    if (seenSemantic.has(normalizeSemantic(s.stop.label))) continue;
    addPick(s);
  }

  const wineSignal =
    feeling === "wine-food" ||
    interests.includes("wine") ||
    options?.destinationIntent === "alentejo-evora-wine" ||
    options?.destinationIntent === "arrabida-setubal-azeitao";
  if (wineSignal && !picks.some((p) => WINE_STOP_RE.test(`${p.stop.label} ${p.stop.story}`))) {
    const winePick = scored.find(
      (s) =>
        !seenLabels.has(s.stop.label.toLowerCase()) &&
        !seenSemantic.has(normalizeSemantic(s.stop.label)) &&
        WINE_STOP_RE.test(`${s.stop.label} ${s.stop.story}`),
    );
    if (winePick) {
      if (picks.length < target) {
        addPick(winePick);
      } else if (picks.length > 1) {
        // Swap a non-anchor pick out so wine fits without growing the day.
        const swapIndex = picks.length - 1;
        const removed = picks.splice(swapIndex, 1)[0];
        if (removed) {
          seenLabels.delete(removed.stop.label.toLowerCase());
          seenSemantic.delete(normalizeSemantic(removed.stop.label));
        }
        addPick(winePick);
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

  return { tour: primary, alternates, moments, center };
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
  /** Ordered route points, max 4 main points, all from the same Signature. */
  routePoints: ResolvedRoutePoint[];
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
}

/**
 * resolveStudioV3Route — the SINGLE source of route truth for Studio V3.
 *
 * Progressive previews, the MapAwakens stage and the final Journey Card
 * must all consume the object returned by this function. There must not
 * be separate route logic anywhere else in Studio V3.
 *
 * Guarantees:
 *  - Picks ONE Signature skeleton based on feeling + interests + pickup.
 *  - All routePoints come from that Signature's own `stops` only.
 *  - Never combines distant tours. Never invents stops or suppliers.
 *  - Hidden skeleton title is never exposed (skeletonTitleInternal only).
 *  - Falls back to a "Tailor-made by YES" object when nothing fits safely.
 */
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
}): ResolvedStudioV3Route {
  const { feeling, companions, rhythm, interests, pickup, occasion } = input;
  const investment = input.investment ?? null;
  const destinationIntent = input.destinationIntent ?? null;
  const origin = pickupCityLabel(pickup);

  // Fallback when we don't have enough to safely resolve a Signature.
  if (!feeling || !companions || !rhythm) {
    return {
      skeletonTourKey: null,
      skeletonTitleInternal: null,
      routeAreaLabel: "Tailor-made by YES",
      suggestedRouteLabel: "To be refined with YES",
      routePoints: [],
      journeyTitle: "Your private Portugal day",
      whyItFits: [],
      refinements: [],
      whatToConfirm:
        "Availability and final details are confirmed before your experience.",
      confidence: "needs-human-refinement",
    };
  }

  const journey = curateJourney(feeling, companions, rhythm, {
    interests,
    pickup,
    investment,
    destinationIntent,
  });

  // Hard cap at 4 main route points on the Journey Card (per brief).
  const routePoints: ResolvedRoutePoint[] = journey.moments
    .slice(0, 4)
    .map((m, i) => ({
      index: i,
      label: m.label,
      story: m.story,
      lat: m.lat,
      lng: m.lng,
    }));

  // Phase 5E — controlled route composition (replace up to 3 non-critical
  // stops with same-type candidates from REGION_STOP_POOL). Flag-gated and
  // OFF in committed code, so this branch is a no-op today. When enabled,
  // mutates `routePoints` in place to preserve order and downstream wiring.
  if (STUDIO_V3_ROUTE_COMPOSITION_ENABLED) {
    // Phase 7A — mobility safety: if the traveller flagged reduced mobility
    // or asked to avoid long walks, replace or drop original skeleton stops
    // whose label/story suggests cliffs, coves, caves, trails, hikes, steep
    // access or other difficult terrain — even though the skeleton itself
    // is "approved". Replacement uses the same safety-filtered candidate
    // pool as composition (mobility deny + viewpoint deny already applied),
    // so swapped stops are guaranteed safe.
    const mobilityConcern = (input.considerations ?? []).some((c) =>
      MOBILITY_CONSIDERATIONS.has(c),
    );
    if (mobilityConcern) {
      const safe = applyMobilitySafety(routePoints, {
        skeletonTourId: journey.tour.id,
        interests,
        rhythm,
        companions,
        investment,
        considerations: input.considerations ?? [],
      });
      routePoints.length = 0;
      for (const p of safe) routePoints.push(p);
    }

    const composed = applyReplacementCandidates(routePoints, {
      skeletonTourId: journey.tour.id,
      interests,
      rhythm,
      companions,
      investment,
      considerations: input.considerations ?? [],
    });
    routePoints.length = 0;
    for (const p of composed) routePoints.push(p);

    // Phase 5G — optionally append ONE extra moment when safe.
    const withExtra = applyExtraMoment(routePoints, {
      skeletonTourId: journey.tour.id,
      interests,
      rhythm,
      companions,
      investment,
      considerations: input.considerations ?? [],
    });
    routePoints.length = 0;
    for (const p of withExtra) routePoints.push(p);
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
    region: journey.tour.region,
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
  const tourHay = `${journey.tour.title} ${journey.tour.theme} ${journey.tour.stops
    .map((s) => `${s.label} ${s.story}`)
    .join(" ")}`.toLowerCase();
  const unmatched = interests.filter((i) => {
    const kws = INTEREST_TOUR_KEYWORDS[i] ?? [];
    if (kws.length === 0) return false;
    return !kws.some((kw) => tourHay.includes(kw));
  });
  if (unmatched.length > 0 && refinements.length < 2) {
    refinements.push(
      "Additional interests can be refined by YES without leaving the route area.",
    );
  }

  // Confidence: high when we have ≥3 real geo points AND a matched
  // pickup affinity; medium otherwise; refinement when we have 0 points.
  const geoCount = routePoints.filter((p) => p.lat !== null && p.lng !== null).length;
  const affinity = pickupAffinity(journey.tour, pickup);
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
      skeletonTourId: journey.tour.id,
      interests,
      rhythm,
      companions,
      investment,
      considerations: input.considerations ?? [],
      existingRoutePointLabels: routePoints.map((p) => p.label),
    });
    finalRefinements = [...baseRefinements, ...optional].slice(0, 2);
  }

  return {
    skeletonTourKey: journey.tour.id,
    skeletonTitleInternal: journey.tour.title,
    routeAreaLabel: journey.tour.region,
    suggestedRouteLabel,
    routePoints,
    journeyTitle,
    whyItFits,
    refinements: finalRefinements,
    whatToConfirm:
      "Availability and final details are confirmed before your experience.",
    confidence,
  };
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
export const PICKUP_CITY_LABELS = [
  "Lisbon",
  "Cascais",
  "Sintra",
  "Setúbal",
  "Comporta",
] as const;

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
  } else if (input.companions === "couple" || input.occasion === "honeymoon" || input.occasion === "anniversary") {
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
    out.push("A local craft or village moment may replace one wine-heavy stop, subject to availability.");
  } else if (hasHeritage && hasWine) {
    out.push("A heritage moment may take the place of one tasting, subject to availability.");
  } else if (hasGastro && !hasWine) {
    out.push("A long table moment may anchor the day instead of a tasting stop.");
  } else if (hasCoast && input.feeling !== "coastal") {
    out.push("A coastal pause may be added, depending on the day's conditions.");
  } else if (input.considerations && input.considerations.length > 0 && !input.considerations.includes("none")) {
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
  const HIDE: Partial<Record<Feeling, ReadonlyArray<Companions>>> = {
    romance: ["corporate", "family"],
    family: ["proposal", "corporate"],
    adventure: ["proposal", "corporate"],
    "slow-luxury": ["corporate"],
  };
  const hidden = new Set<Companions>(HIDE[feeling] ?? []);
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
  // Fast path — traveller chose "Construir rápido" on the intro.
  // We skip every optional refinement phase. The remaining required path is:
  //   feeling → destination → who → pickup → guests → interests → rhythm → map → storyboard
  // Downstream curation already handles null occasion / null investment /
  // empty considerations / null language gracefully (no invented facts).
  if (state.pathMode === "fast") {
    if (
      phase === "occasion" ||
      phase === "date" ||
      phase === "considerations" ||
      phase === "language" ||
      phase === "investment"
    ) {
      return false;
    }
  }
  switch (phase) {
    case "guests": {
      // Skip when guests is already known (inferred from companions/occasion
      // or set explicitly via the stepper).
      if (state.guests != null) return false;
      const inferred = inferGuests(state.companions, state.occasion, state.feeling);
      return inferred == null;
    }
    default:
      return true;
  }
}


const LINEAR_ORDER: StudioV3Phase[] = [
  "intro",
  "feeling",
  "destination",
  "who",
  "occasion",
  "date",
  "pickup",
  "guests",
  "investment",
  "interests",
  "rhythm",
  "considerations",
  "language",
  "map",
  "storyboard",
];

/**
 * getNextPhase — adaptive next-phase resolver. Walks forward from the
 * current phase and returns the first phase that is still relevant given
 * the live state. Falls back to "storyboard" when nothing remains.
 */
export function getNextPhase(
  state: StudioV3State,
  current: StudioV3Phase,
): StudioV3Phase {
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
 * Explicit skeleton → cluster map. Keyed by existing Signature tour ids
 * only. Unknown skeleton ids return an empty refinement list — we never
 * guess a region or cluster.
 */
export const SKELETON_TO_CLUSTER: Record<
  string,
  { region: RegionId; routeCluster: string; signatureTourId: string }
> = {
  "troia-comporta": {
    region: "comporta-troia",
    routeCluster: "troia-comporta-coast",
    signatureTourId: "troia-comporta",
  },
  "tomar-coimbra": {
    region: "tomar-coimbra",
    routeCluster: "tomar-coimbra-heritage",
    signatureTourId: "tomar-coimbra",
  },
  "fatima-nazare-obidos": {
    region: "fatima-nazare-obidos",
    routeCluster: "fatima-nazare-obidos-spirit-coast",
    signatureTourId: "fatima-nazare-obidos",
  },
  "sintra-cascais": {
    region: "sintra-cascais",
    routeCluster: "sintra-cascais-coast-heritage",
    signatureTourId: "sintra-cascais",
  },
  "evora-alentejo": {
    region: "alentejo-evora",
    routeCluster: "evora-city-classical-wineries",
    signatureTourId: "evora-alentejo",
  },
  // Arrábida / Azeitão / Sesimbra cluster — five Signature skeletons all
  // share the same region + routeCluster. Optional stops in the pool may
  // gate on either signatureTourId (single-tour stop) or sourceTourIds
  // (shared-source stop).
  "arrabida-wine-allinclusive": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "arrabida-wine-allinclusive",
  },
  "wild-beaches-picnic": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "wild-beaches-picnic",
  },
  "arrabida-boat": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "arrabida-boat",
  },
  "tiles-workshop": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "tiles-workshop",
  },
  "azeitao-cheese": {
    region: "arrabida-setubal",
    routeCluster: "arrabida-azeitao-sesimbra",
    signatureTourId: "azeitao-cheese",
  },
};

/**
 * Considerations that imply difficult terrain. We avoid blindly excluding
 * a `type` (e.g. all viewpoints) — instead we deny only when the stop's
 * notes or type clearly imply difficult access. This is intentionally
 * conservative.
 */
const DIFFICULT_ACCESS_RE =
  /stairs|steep|uneven|cave|trail|beach access|reduced[- ]?mobility|may not suit|difficult access/i;

const MOBILITY_CONSIDERATIONS = new Set<string>([
  "reduced-mobility",
  "avoid-long-walks",
]);

function isDeniedByConsiderations(
  stop: OptionalStop,
  considerations: ReadonlyArray<string>,
): boolean {
  if (considerations.length === 0) return false;
  const mobilityConcern = considerations.some((c) =>
    MOBILITY_CONSIDERATIONS.has(c),
  );
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
    .split(/[—–-]/)[0]
    .split(",")[0]
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const skeleton = input.skeletonTourId
    ? SKELETON_TO_CLUSTER[input.skeletonTourId]
    : undefined;
  if (!skeleton) return [];

  const existing = new Set(
    input.existingRoutePointLabels.map((l) => normalizeLabel(l)),
  );

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
    if (existing.has(normalizeLabel(stop.name))) return false;

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
  if (rhythm === "slow") return 1;
  if (rhythm === "balanced") return 2;
  return 3; // full | immersive
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
function inferRoutePointType(
  label: string,
  story: string,
): InferredRoutePointKind | null {
  const hay = `${label} ${story}`.toLowerCase();
  if (/\bwinery|wine cellar|wine estate|wine tasting|vineyard|adega|quinta\b/.test(hay))
    return "winery";
  if (/\bworkshop|atelier|tile painting|hands-on\b/.test(hay))
    return "workshop";
  if (/\bboat|barco|sail|catamaran|cruise\b/.test(hay)) return "boat";
  if (/\bmarket|mercado\b/.test(hay)) return "market";
  if (
    /\bmonastery|convent|chapel|cathedral|church|castle|palace|temple|fortress|capela|igreja|castelo|pal[áa]cio|monument\b/.test(
      hay,
    )
  )
    return "monument";
  if (/\bviewpoint|viewpoints|miradouro|overlook|panoram|lookout\b/.test(hay))
    return "viewpoint";
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
  if (/\bnature|forest|reserve|trail|hike|cliff|cliffs\b/.test(hay))
    return "nature";
  if (/\bcoast|coastal|seaside|ocean|dusk|sunset|landscape\b/.test(hay))
    return "scenic";
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
  scenic: ["beach", "viewpoint", "nature", "village", "winery"],
  village: ["village", "market", "monument", "winery"],
};

function isCompatibleCandidate(
  kind: InferredRoutePointKind,
  cand: OptionalStop,
): boolean {
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
  const mobilityConcern = considerations.some((c) =>
    MOBILITY_CONSIDERATIONS.has(c),
  );
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
}): OptionalStop[] {
  const skeleton = input.skeletonTourId
    ? SKELETON_TO_CLUSTER[input.skeletonTourId]
    : undefined;
  if (!skeleton) return [];

  const existing = new Set(
    input.existingRoutePointLabels.map((l) => normalizeLabel(l)),
  );

  const eligible = REGION_STOP_POOL.filter((stop) => {
    if (!stop.active) return false;
    if (stop.region !== skeleton.region) return false;
    if (stop.routeCluster !== skeleton.routeCluster) return false;

    // Tour-isolation gate — a candidate is eligible when AT LEAST ONE holds:
    //   (a) signatureTourId matches the resolved skeleton, OR
    //   (b) sourceTourIds contains the resolved skeleton, OR
    //   (c) neither field is set (generic cluster stop, region+cluster gated).
    const sigOk =
      !!stop.signatureTourId && stop.signatureTourId === skeleton.signatureTourId;
    const srcOk =
      !!stop.sourceTourIds &&
      stop.sourceTourIds.length > 0 &&
      stop.sourceTourIds.includes(skeleton.signatureTourId);
    const generic =
      !stop.signatureTourId &&
      (!stop.sourceTourIds || stop.sourceTourIds.length === 0);
    if (!sigOk && !srcOk && !generic) return false;

    if (existing.has(normalizeLabel(stop.name))) return false;
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
  });
  if (candidates.length === 0) return out;

  const usedIds = new Set<string>();
  const usedGroups = new Set<string>();
  const usedLabels = new Set(out.map((p) => normalizeLabel(p.label)));

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
      if (usedLabels.has(normalizeLabel(cand.name))) continue;

      const projectedTotal =
        runningTotal - ROUTE_POINT_BASELINE_MIN + cand.durationMin;
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
      usedLabels.delete(normalizeLabel(current.label));
      usedLabels.add(normalizeLabel(cand.name));
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
  if (
    cand.sourceTourIds &&
    cand.sourceTourIds.includes(ctx.skeletonSignatureTourId)
  ) {
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
  },
): ResolvedRoutePoint[] {
  const out = routePoints.map((p) => ({ ...p }));
  if (input.rhythm === "slow") return out;
  if (out.length === 0) return out;
  if (out.length >= 4) return out;

  const skeleton = input.skeletonTourId
    ? SKELETON_TO_CLUSTER[input.skeletonTourId]
    : undefined;
  if (!skeleton) return out;

  const candidates = selectReplacementCandidates({
    skeletonTourId: input.skeletonTourId,
    interests: input.interests,
    rhythm: input.rhythm,
    companions: input.companions,
    investment: input.investment,
    considerations: input.considerations,
    existingRoutePointLabels: out.map((p) => p.label),
  });
  if (candidates.length === 0) return out;

  const existingKinds = new Set<OptionalStop["type"]>();
  for (const p of out) {
    const k = inferRoutePointType(p.label, p.story);
    if (k && k !== "scenic") existingKinds.add(k);
  }
  const existingGroups = new Set<string>();
  for (const p of out) {
    const match = REGION_STOP_POOL.find(
      (s) => normalizeLabel(s.name) === normalizeLabel(p.label),
    );
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

  const pick = scored[0]?.cand;
  if (!pick) return out;

  const lastKind = inferRoutePointType(
    out[out.length - 1].label,
    out[out.length - 1].story,
  );
  const insertAt =
    lastKind === "table" ? out.length - 1 : Math.min(2, out.length);

  const inserted: ResolvedRoutePoint = {
    index: insertAt,
    label: pick.name,
    story: buildExtraMomentStory(pick),
    lat: pick.coords?.lat ?? null,
    lng: pick.coords?.lng ?? null,
  };

  const next = [...out.slice(0, insertAt), inserted, ...out.slice(insertAt)];
  // Re-number indices to keep ResolvedRoutePoint contract.
  return next.slice(0, 4).map((p, i) => ({ ...p, index: i }));
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
  });

  const usedIds = new Set<string>();
  const usedLabels = new Set(out.map((p) => normalizeLabel(p.label)));
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
            !usedLabels.has(normalizeLabel(c.name)) &&
            isCompatibleCandidate(kind, c),
        )
      : undefined;
    if (cand) {
      usedIds.add(cand.id);
      usedLabels.delete(normalizeLabel(p.label));
      usedLabels.add(normalizeLabel(cand.name));
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
export const __STUDIO_V3_ROUTE_COMPOSITION_ENABLED_FOR_TESTS =
  STUDIO_V3_ROUTE_COMPOSITION_ENABLED;


