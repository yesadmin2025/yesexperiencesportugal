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
  Feeling,
  Interest,
  Occasion,
  Pickup,
  Rhythm,
} from "./types";

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

export function curateJourney(
  feeling: Feeling,
  companions: Companions,
  rhythm: Rhythm,
): CuratedJourney {
  const ids = FEELING_TO_TOURS[feeling] ?? [];
  const tours = ids
    .map((id) => signatureTours.find((t) => t.id === id))
    .filter((t): t is SignatureTour => Boolean(t));

  const primary =
    tours[0] ??
    signatureTours.find((t) => t.id === "arrabida-wine-allinclusive") ??
    signatureTours[0];
  const alternates = tours.slice(1, 3);

  // Build the regional pool — all stops from tours sharing the same
  // seed.region as the primary. Falls back to the primary alone if the
  // region key is missing or no siblings exist.
  const regionKey = primary.seed?.region;
  const regionalTours = regionKey
    ? signatureTours.filter((t) => t.seed?.region === regionKey)
    : [primary];

  const pool: PoolStop[] = [];
  for (const t of regionalTours) {
    for (const s of t.stops) {
      pool.push({
        fromTourId: t.id,
        label: s.label,
        story: s.story,
        image: s.image,
        focal: s.focal,
        imageTheme: s.imageTheme,
        isBaseTour: t.id === primary.id,
      });
    }
  }

  // Score + sort. Stable order: score desc, then base-tour first, then
  // resolvable-coords first, then by original pool order.
  const scored = pool
    .map((s, i) => {
      const geo = lookupStop(s.label);
      return {
        stop: s,
        score: scoreStop(s, feeling, companions),
        hasGeo: Boolean(geo),
        geo,
        order: i,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.stop.isBaseTour !== b.stop.isBaseTour) return a.stop.isBaseTour ? -1 : 1;
      if (a.hasGeo !== b.hasGeo) return a.hasGeo ? -1 : 1;
      return a.order - b.order;
    });

  const target = Math.min(RHYTHM_STOP_COUNT[rhythm], scored.length);

  // Anchor: first stop is the base tour's opening stop when present, so
  // the day has a clear narrative arc rooted in a real Signature.
  const anchor = scored.find(
    (s) => s.stop.isBaseTour && s.stop.label === primary.stops[0]?.label,
  );
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

  const moments: CuratedMoment[] = picks.map((s, i) => ({
    index: i,
    label: s.stop.label,
    story: s.stop.story,
    image: s.stop.image,
    focal: s.stop.focal,
    lat: s.geo?.lat ?? null,
    lng: s.geo?.lng ?? null,
    fromTourId: s.stop.fromTourId,
    borrowed: !s.stop.isBaseTour,
  }));

  const firstGeo = moments.find((m) => m.lat !== null && m.lng !== null);
  const center =
    firstGeo && firstGeo.lat !== null && firstGeo.lng !== null
      ? { lat: firstGeo.lat, lng: firstGeo.lng }
      : null;

  return { tour: primary, alternates, moments, center };
}
