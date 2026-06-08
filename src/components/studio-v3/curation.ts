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
import type {
  ChoiceOption,
  Companions,
  CompanionsType,
  Consideration,
  Feeling,
  IntentLevel,
  IntentProfile,
  IntentType,
  Interest,
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

const RHYTHM_STOP_COUNT: Record<Rhythm, number> = {
  slow: 3,
  balanced: 4,
  full: 5,
  immersive: 6,
};

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
): { tour: SignatureTour; alternates: SignatureTour[] } {
  const candidateIds = FEELING_TO_TOURS[feeling] ?? [];
  const candidates = candidateIds
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is SignatureTour => Boolean(t));

  if (candidates.length === 0) {
    const fallback =
      signatureTours.find((t) => t.id === "arrabida-wine-allinclusive") ??
      signatureTours[0];
    return { tour: fallback, alternates: [] };
  }

  const scored = candidates
    .map((tour, order) => {
      let score = 0;
      score += pickupAffinity(tour, pickup) * 1.2;
      score += interestAffinity(tour, interests);
      // Companions soft hints — proposal/celebration lean wine/heritage tours.
      if (companions === "family" && /family|child/i.test(tour.idealFor.join(" "))) {
        score += 0.5;
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
  },
): CuratedJourney {
  const interests = options?.interests ?? [];
  const pickup = options?.pickup ?? null;

  const { tour: primary, alternates } = pickPrimaryTour(
    feeling,
    companions,
    interests,
    pickup,
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
      if (interests.length > 0) {
        const hay = `${s.label} ${s.story}`.toLowerCase();
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
      return { stop: s, score, hasGeo: Boolean(geo), geo, order: i };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.hasGeo !== b.hasGeo) return a.hasGeo ? -1 : 1;
      return a.order - b.order;
    });

  // Cap stops by rhythm but never exceed what the tour actually has.
  const target = Math.min(RHYTHM_STOP_COUNT[rhythm], scored.length);

  // Anchor on the tour's opening stop so the narrative arc is intact.
  const anchor = scored.find((s) => s.stop.label === primary.stops[0]?.label);
  const picks: typeof scored = [];
  const seenLabels = new Set<string>();
  if (anchor) {
    picks.push(anchor);
    seenLabels.add(anchor.stop.label.toLowerCase());
  }
  for (const s of scored) {
    if (picks.length >= target) break;
    const key = s.stop.label.toLowerCase();
    if (seenLabels.has(key)) continue;
    picks.push(s);
    seenLabels.add(key);
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
}): ResolvedStudioV3Route {
  const { feeling, companions, rhythm, interests, pickup, occasion } = input;
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

  const journey = curateJourney(feeling, companions, rhythm, { interests, pickup });

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

  return {
    skeletonTourKey: journey.tour.id,
    skeletonTitleInternal: journey.tour.title,
    routeAreaLabel: journey.tour.region,
    suggestedRouteLabel,
    routePoints,
    journeyTitle,
    whyItFits,
    refinements: refinements.slice(0, 2),
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
 * chosen companion type. Solo: hide couple/group-only. Corporate: hide
 * romantic + family-day. Couple: hide family-day + corporate.
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
    corporate: ["proposal", "honeymoon", "anniversary", "family-day", "birthday"],
  };
  const hidden = new Set(HIDE[cType]);
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

/* ---------- Phase relevance ---------- */

/**
 * isPhaseRelevant — true when this phase still needs to be asked given
 * what's already known. Used by getNextPhase to skip irrelevant phases.
 */
export function isPhaseRelevant(phase: StudioV3Phase, state: StudioV3State): boolean {
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
  "who",
  "occasion",
  "date",
  "pickup",
  "guests",
  "interests",
  "rhythm",
  "considerations",
  "language",
  "investment",
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
