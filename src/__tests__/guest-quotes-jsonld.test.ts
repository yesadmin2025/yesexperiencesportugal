/**
 * Build-time guard: the JSON-LD emitted by <GuestQuotes /> must comply
 * with Google's review guidelines and never re-introduce self-serving
 * AggregateRating on Organization/LocalBusiness or multi-platform
 * review aggregation. Individual Review nodes are allowed only when
 * they carry a real source URL (attribution + verification).
 */
import { describe, expect, it } from "vitest";
import {
  buildGuestQuotesJsonLd,
  type GuestQuoteReview,
} from "@/lib/guest-quotes-jsonld";

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
    body: "A hidden gem completely different from Lisbon. Nidia was the perfect host.",
    reviewer_name: "George",
    reviewer_country: "United States",
    source_url: "https://www.tripadvisor.com/ShowUserReviews-g189158-d34324410-r1064714830",
    published_at: "2026-06-17T00:00:00+00:00",
  },
];

const UNSOURCED_QUOTE: GuestQuoteReview = {
  id: "ghi-firstparty",
  source: "first_party",
  rating: 5,
  body: "Simply flawless. Booked directly and every detail lived up to the promise.",
  reviewer_name: null,
  reviewer_country: null,
  source_url: null,
  published_at: "2026-05-14T00:00:00+00:00",
};

describe("GuestQuotes JSON-LD — conservative policy", () => {
  it("returns null when there are no source-attributed reviews", () => {
    expect(buildGuestQuotesJsonLd([], { count: null, avg: null })).toBeNull();
    expect(buildGuestQuotesJsonLd([UNSOURCED_QUOTE], { count: 712, avg: 4.9 })).toBeNull();
  });

  it("never emits AggregateRating and never emits itemReviewed on Organization", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: 712, avg: 4.9 });
    expect(payload).not.toBeNull();
    const graph = payload!["@graph"] as Record<string, unknown>[];
    expect(graph.some((n) => n["@type"] === "AggregateRating")).toBe(false);
    for (const node of graph) {
      const item = node.itemReviewed as Record<string, unknown> | undefined;
      if (item) expect(item["@type"]).not.toBe("Organization");
    }
  });

  it("emits one Review node per source-attributed quote", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: null, avg: null });
    const graph = payload!["@graph"] as Record<string, unknown>[];
    const reviews = graph.filter((n) => n["@type"] === "Review");
    expect(reviews.length).toBe(FIXTURE_QUOTES.length);
    for (const r of reviews) {
      expect(typeof r.url).toBe("string");
      expect(String(r.url)).toMatch(/^https?:\/\//);
      const rating = r.reviewRating as Record<string, unknown>;
      expect(rating.ratingValue).toBeGreaterThanOrEqual(1);
      expect(rating.ratingValue).toBeLessThanOrEqual(5);
      const author = r.author as Record<string, unknown>;
      expect(author["@type"]).toBe("Person");
    }
  });

  it("emits author.nationality only when the source review carries a country", () => {
    const payload = buildGuestQuotesJsonLd(FIXTURE_QUOTES, { count: null, avg: null });
    const reviews = (payload!["@graph"] as Record<string, unknown>[]).filter(
      (n) => n["@type"] === "Review",
    );
    const withCountry = reviews.find(
      (r) => ((r.author as Record<string, unknown>)?.nationality as unknown) !== undefined,
    );
    expect(withCountry).toBeTruthy();
    const nat = (withCountry!.author as Record<string, unknown>).nationality as Record<
      string,
      unknown
    >;
    expect(nat["@type"]).toBe("Country");
    expect(nat.name).toBe("United States");
  });
});
