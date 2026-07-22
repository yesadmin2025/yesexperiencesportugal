/**
 * Review platforms — single source of truth for verifiable social proof.
 *
 * Every widget that cites a rating, review count, or "verified" claim reads
 * from this file. Do NOT hard-code platform counts anywhere else, and do NOT
 * sum these counts programmatically — the combined figure below
 * (`TOTAL_VERIFIED_REVIEWS`) is a manual, conservative number the operator
 * has verified against the same `lastVerifiedAt` snapshot.
 *
 * How to update
 * -------------
 * 1. Open each platform URL, read the current rating + review count.
 * 2. Edit the entries below.
 * 3. Bump `lastVerifiedAt` to today's ISO date (YYYY-MM-DD).
 * 4. Update `TOTAL_VERIFIED_REVIEWS` only if the manual sum genuinely changed
 *    — always keep it conservative (round DOWN, never up).
 * 5. Commit. Nothing else needs to change.
 *
 * Rules
 * -----
 * - Never invent, aggregate across sources programmatically, or reuse the
 *   same review across platforms.
 * - Never emit AggregateRating on Organization/LocalBusiness from this data.
 *   Google explicitly disallows self-serving aggregates from third-party
 *   platform widgets. Product-level AggregateRating (per Signature) is
 *   handled separately by `withAggregateAndReviews()` using verified
 *   per-product Viator meta, and only when reviews are visible on the page.
 * - The combined phrasing must always be paired with "across verified
 *   platforms" so the number is legible as a sum, not a per-platform claim.
 */
import { SOCIAL } from "@/config/business-nap";

export type ReviewPlatformId = "tripadvisor" | "google" | "viator";

export interface ReviewPlatform {
  id: ReviewPlatformId;
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  /** ISO date (YYYY-MM-DD) the operator last verified rating + reviewCount. */
  lastVerifiedAt: string;
}

const LAST_VERIFIED = "2026-07-22" as const;

export const REVIEW_PLATFORMS: readonly ReviewPlatform[] = [
  {
    id: "tripadvisor",
    name: "Tripadvisor",
    rating: 5.0,
    reviewCount: 180,
    url: SOCIAL.tripadvisor,
    lastVerifiedAt: LAST_VERIFIED,
  },
  {
    id: "google",
    name: "Google",
    rating: 5.0,
    reviewCount: 120,
    url: SOCIAL.google,
    lastVerifiedAt: LAST_VERIFIED,
  },
  {
    id: "viator",
    name: "Viator",
    rating: 5.0,
    reviewCount: 400,
    url: "https://www.viator.com/tours/Lisbon/d538",
    lastVerifiedAt: LAST_VERIFIED,
  },
] as const;

/**
 * Conservative, operator-verified combined count. NEVER computed by summing
 * `REVIEW_PLATFORMS[*].reviewCount` at runtime — the platforms may double-count
 * the same guest, so the manual figure is always the source of truth and is
 * always paired with the phrase "across verified platforms".
 */
export const TOTAL_VERIFIED_REVIEWS = 700 as const;

export const VERIFIED_PLATFORMS_SUFFIX_EN = "across verified platforms" as const;
export const VERIFIED_PLATFORMS_SUFFIX_PT = "em plataformas verificadas" as const;

export function formatVerifiedLine(locale: "en" | "pt" = "en"): string {
  const suffix = locale === "pt" ? VERIFIED_PLATFORMS_SUFFIX_PT : VERIFIED_PLATFORMS_SUFFIX_EN;
  const reviewsWord = locale === "pt" ? "avaliações 5★" : "five-star reviews";
  return `${TOTAL_VERIFIED_REVIEWS}+ ${reviewsWord} ${suffix}`;
}
