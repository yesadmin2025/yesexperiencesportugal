/**
 * Build-time guard: the JSON-LD emitted by <GuestQuotes /> must keep
 * passing Google's Rich Results rules for Review + AggregateRating.
 *
 * If Google's spec shifts or someone edits `buildGuestQuotesJsonLd`
 * in a way that drops author/itemReviewed/rating fields, this test
 * fails at CI time — long before a real Google recrawl would notice.
 *
 * The mirrored ruleset lives in `src/lib/rich-results-validator.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  buildGuestQuotesJsonLd,
  FALLBACK_COUNT,
  FALLBACK_RATING,
  type GuestQuoteReview,
} from "@/lib/guest-quotes-jsonld";
import { validateRichResults } from "@/lib/rich-results-validator";

const FIXTURE_QUOTES: GuestQuoteReview[] = [
  {
    id: "abc-tripadvisor-1",
    source: "tripadvisor",
    rating: 5,
    body: "Sesimbra is now one of my favorite places in the world. Our guide Tiago made the day.",
    reviewer_name: "Rebecca S",
    reviewer_country: null,
    source_url: "https://www.tripadvisor.com/ShowUserReviews-g189158-d24072057-r1066364972",
    published_at: "2026-06-30T00:00:00+00:00",
  },
  {
    id: "def-tripadvisor-2",
    source: "tripadvisor",
    rating: 5,
    body: "A hidden gem completely different from Lisbon. Nidia was the perfect host — attentive, calm, generous.",
    reviewer_name: "George",
    reviewer_country: "United States",
    source_url: "https://www.tripadvisor.com/ShowUserReviews-g189158-d34324410-r1064714830",
    published_at: "2026-06-17T00:00:00+00:00",
  },
  {
    id: "ghi-firstparty",
    source: "first_party",
    rating: 5,
    body: "Simply flawless. Booked directly and every detail lived up to the promise.",
    reviewer_name: null, // exercises the "Verified guest" author fallback
    reviewer_country: null,
    source_url: null, // exercises the pageUrl fallback for review.url
    published_at: "2026-05-14T00:00:00+00:00",
  },
];

/** Fixture with intentionally-missing optional fields, used to prove the
 * validator surfaces "recommended field missing" warnings without turning
 * them into errors. */
const SPARSE_QUOTE: GuestQuoteReview = {
  id: "sparse-1",
  source: "first_party",
  rating: 5,
  body: "Booked and confirmed within minutes.",
  reviewer_name: null,
  reviewer_country: null,
  source_url: null,
  published_at: null,
};


function expectClean(payload: unknown, minReviews: number) {
  const report = validateRichResults(payload);
  expect(
    report.errors,
    `expected zero Rich-Results errors, got:\n${report.errors.join("\n")}`,
  ).toEqual([]);
  expect(
    report.warnings,
    `expected zero Rich-Results warnings, got:\n${report.warnings.join("\n")}`,
  ).toEqual([]);
  expect(report.counts.aggregateRating).toBe(1);
  expect(report.counts.reviews).toBe(minReviews);
}

describe("GuestQuotes JSON-LD → Google Rich Results guard", () => {
  it("empty carousel still emits a valid AggregateRating with the 700+ fallback", () => {
    const payload = buildGuestQuotesJsonLd([], { count: null, avg: null });
    expectClean(payload, 0);
    const agg = (payload["@graph"][0] ?? {}) as Record<string, unknown>;
    expect(agg.ratingValue).toBe(FALLBACK_RATING);
    expect(agg.reviewCount).toBe(FALLBACK_COUNT);
  });

  it("uses live aggregate stats when provided", () => {
    const payload = buildGuestQuotesJsonLd([], { count: 742, avg: 4.87 });
    expectClean(payload, 0);
    const agg = payload["@graph"][0] as Record<string, unknown>;
    expect(agg.reviewCount).toBe(742);
    expect(agg.ratingValue).toBe(4.9); // rounded to 1dp
  });

  it("passes with a realistic featured-quotes payload", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: 712, avg: 4.9 });
    expectClean(payload, FIXTURE_QUOTES.length);
  });

  it("each Review carries url, author, itemReviewed.name and rating consistently", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: 712, avg: 4.9 });
    const reviews = (payload["@graph"] as Record<string, unknown>[]).filter(
      (n) => n["@type"] === "Review",
    );
    for (const r of reviews) {
      expect(typeof r.url).toBe("string");
      expect(String(r.url)).toMatch(/^https?:\/\//);
      const it = r.itemReviewed as Record<string, unknown>;
      expect(it["@type"]).toBe("Organization");
      expect(it.name).toBe("YES Experiences Portugal");
      const rating = r.reviewRating as Record<string, unknown>;
      expect(rating.ratingValue).toBeGreaterThanOrEqual(1);
      expect(rating.ratingValue).toBeLessThanOrEqual(5);
      expect(rating.bestRating).toBe(5);
      const author = r.author as Record<string, unknown>;
      expect(author["@type"]).toBe("Person");
      expect(typeof author.name).toBe("string");
    }
  });

  it("emits author.nationality only when the source review carries a country", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: 712, avg: 4.9 });
    const reviews = (payload["@graph"] as Record<string, unknown>[]).filter(
      (n) => n["@type"] === "Review",
    );
    const withCountry = reviews.find(
      (r) => ((r.author as Record<string, unknown>)?.nationality as unknown) !== undefined,
    );
    expect(withCountry, "at least one fixture has a country").toBeTruthy();
    const nat = (withCountry!.author as Record<string, unknown>).nationality as Record<
      string,
      unknown
    >;
    expect(nat["@type"]).toBe("Country");
    expect(nat.name).toBe("United States");
  });

  it("detects regressions — a stripped Review fails the validator", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: 712, avg: 4.9 });
    const graph = payload["@graph"] as Record<string, unknown>[];
    // Simulate a regression: drop author + reviewRating on the first Review
    const firstReview = graph.find((n) => n["@type"] === "Review")!;
    delete firstReview.author;
    delete firstReview.reviewRating;
    const report = validateRichResults(payload);
    expect(report.errors.some((e) => e.includes("author missing"))).toBe(true);
    expect(report.errors.some((e) => e.includes("reviewRating missing"))).toBe(true);
  });
});
