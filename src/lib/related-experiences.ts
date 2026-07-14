/**
 * Internal-linking recommender.
 *
 * Ranks Signature tours and Local Stories against a page context
 * (a Signature tour, a Local Story, or a raw region/style/highlight
 * seed) so every planning page can surface a small, editorially
 * coherent set of related experiences and destinations. Strengthens
 * topical authority by keeping the region/style/highlight cluster
 * densely interlinked — without hand-curating every page.
 *
 * Rules (aligned with brand memory):
 *   - Never invents content. Only recommends items that already exist
 *     in `signatureTours` or `LOCAL_STORIES_ARTICLES`.
 *   - Deterministic, pure — no fetches, safe to run in loaders and
 *     during SSR.
 *   - Ties broken by original catalog order so results stay stable
 *     across renders.
 */

import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import {
  LOCAL_STORIES_ARTICLES,
  type LocalStoryArticle,
} from "@/content/local-stories-articles";

// ── Region tokenisation ────────────────────────────────────────────────
// Tour `region` strings look like "Setúbal · Arrábida",
// "Tróia · Comporta · Alentejo", "Southwest Alentejo · Costa Vicentina".
// Tokenise on the middle dot and normalise so "Setúbal" and "setubal"
// collide.
const REGION_SEPARATOR = /\s*·\s*|\s+-\s+/;

function normalizeToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip diacritics
}

function regionTokens(region: string | null | undefined): string[] {
  if (!region) return [];
  return region
    .split(REGION_SEPARATOR)
    .map(normalizeToken)
    .filter(Boolean);
}

function overlapCount<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const seen = new Set(a);
  let n = 0;
  for (const x of b) if (seen.has(x)) n++;
  return n;
}

// ── Public seed shape ──────────────────────────────────────────────────
export interface RelatedSeed {
  /** Tour id to exclude from results (usually the current page). */
  excludeTourId?: string;
  /** Full region string, e.g. "Setúbal · Arrábida". */
  region?: string | null;
  /** Style tags from `SignatureTour.seed.styles`. */
  styles?: readonly string[];
  /** Highlight tags from `SignatureTour.seed.highlights`. */
  highlights?: readonly string[];
}

export function seedFromTour(tour: SignatureTour): RelatedSeed {
  return {
    excludeTourId: tour.id,
    region: tour.region,
    styles: tour.seed?.styles,
    highlights: tour.seed?.highlights,
  };
}

export function seedFromStory(story: LocalStoryArticle): RelatedSeed | null {
  const primary = signatureTours.find((t) => t.id === story.signatureSlug);
  if (!primary) return null;
  return seedFromTour(primary);
}

// ── Tour ranking ───────────────────────────────────────────────────────
export interface RankedTour {
  tour: SignatureTour;
  score: number;
}

/**
 * Score a candidate tour against a seed.
 *   +5  same region string
 *   +2  per shared region token
 *   +2  per shared style
 *   +1  per shared highlight
 */
export function scoreTour(candidate: SignatureTour, seed: RelatedSeed): number {
  let score = 0;
  if (seed.region && candidate.region === seed.region) score += 5;
  const sharedTokens = overlapCount(regionTokens(seed.region), regionTokens(candidate.region));
  score += sharedTokens * 2;
  score += overlapCount(seed.styles, candidate.seed?.styles) * 2;
  score += overlapCount(seed.highlights, candidate.seed?.highlights);
  return score;
}

/**
 * Return the top-N related Signature tours for a seed, sorted by
 * score DESC then original catalog order. Tours with score 0 are
 * still returned as filler so the rail is never empty on obscure
 * pages, but scored matches always come first.
 */
export function rankRelatedTours(seed: RelatedSeed, limit = 3): SignatureTour[] {
  const scored: Array<{ tour: SignatureTour; score: number; index: number }> = [];
  signatureTours.forEach((tour, index) => {
    if (seed.excludeTourId && tour.id === seed.excludeTourId) return;
    scored.push({ tour, score: scoreTour(tour, seed), index });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.tour);
}

// ── Local Story ranking ────────────────────────────────────────────────

/**
 * Score a Local Story against a seed anchored on a specific tour id.
 *   +6  story's primary signatureSlug is the seed tour
 *   +3  story lists the seed tour in relatedSignatures
 *   +2  per shared region token between the story's primary tour and the seed
 *   +1  per shared style
 */
function scoreStory(story: LocalStoryArticle, seed: RelatedSeed): number {
  let score = 0;
  if (seed.excludeTourId && story.signatureSlug === seed.excludeTourId) score += 6;
  if (
    seed.excludeTourId &&
    story.relatedSignatures?.some((r) => r.slug === seed.excludeTourId)
  ) {
    score += 3;
  }
  const primary = signatureTours.find((t) => t.id === story.signatureSlug);
  if (primary) {
    score += overlapCount(regionTokens(seed.region), regionTokens(primary.region)) * 2;
    score += overlapCount(seed.styles, primary.seed?.styles);
  }
  return score;
}

/**
 * Related Local Stories for a Signature tour page — surfaces the
 * matching editorial article first, then thematically close ones.
 */
export function relatedStoriesForTour(
  tour: SignatureTour,
  limit = 3,
): LocalStoryArticle[] {
  const seed: RelatedSeed = {
    excludeTourId: tour.id,
    region: tour.region,
    styles: tour.seed?.styles,
    highlights: tour.seed?.highlights,
  };
  const scored = LOCAL_STORIES_ARTICLES.map((story, index) => ({
    story,
    // The seed excludes the tour id but for story scoring we want to
    // *reward* the story whose primary tour IS this one — flip the
    // exclude for scoring only.
    score: scoreStory(story, { ...seed, excludeTourId: tour.id }),
    index,
  }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.story);
}

/**
 * Related Local Stories from another Local Story — skips the current
 * article and prefers stories sharing the same primary Signature tour
 * or the same region cluster.
 */
export function relatedStoriesForStory(
  current: LocalStoryArticle,
  limit = 3,
): LocalStoryArticle[] {
  const primary = signatureTours.find((t) => t.id === current.signatureSlug);
  const seedTokens = primary ? regionTokens(primary.region) : [];
  const seedStyles = primary?.seed?.styles ?? [];
  const scored = LOCAL_STORIES_ARTICLES.filter((s) => s.slug !== current.slug).map(
    (story, index) => {
      let score = 0;
      if (story.signatureSlug === current.signatureSlug) score += 5;
      const p = signatureTours.find((t) => t.id === story.signatureSlug);
      if (p) {
        score += overlapCount(seedTokens, regionTokens(p.region)) * 2;
        score += overlapCount(seedStyles, p.seed?.styles);
      }
      return { story, score, index };
    },
  );
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.story);
}
