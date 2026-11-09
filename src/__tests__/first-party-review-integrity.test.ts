import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { withFirstPartyReviews } from "@/lib/first-party-review-schema";
import { filterVisibleReviews } from "@/lib/tour-reviews-filter";

const named = (i: number, rating = 5) => ({
  rating,
  body: `Synthetic review body number ${i}`,
  reviewer_name: `Guest ${i}`,
});

describe("first-party review schema integrity", () => {
  const product = { "@type": "Product", name: "Synthetic tour" };

  it("5 named + 1 anonymous: aggregate counts 6, review array only the 5 named", () => {
    const reviews = [1, 2, 3, 4, 5].map((i) => named(i)).concat({
      rating: 4,
      body: "Anonymous but real approved review",
      reviewer_name: null,
    } as never);
    const ld = withFirstPartyReviews(product, { count: 6, average: 4.83, reviews }) as any;
    expect(ld.aggregateRating.reviewCount).toBe(6);
    expect(ld.aggregateRating.ratingValue).toBe(4.8);
    expect(ld.review).toHaveLength(5);
    expect(JSON.stringify(ld)).not.toContain("Verified guest");
    expect(ld.review.every((r: any) => r.author.name.startsWith("Guest"))).toBe(true);
  });

  it("omits itemReviewed in nested Review and AggregateRating", () => {
    const ld = withFirstPartyReviews(product, { count: 1, average: 5, reviews: [named(1)] }) as any;
    expect(ld.aggregateRating.itemReviewed).toBeUndefined();
    expect(ld.review[0].itemReviewed).toBeUndefined();
  });

  it("no reviews → no rating schema", () => {
    const ld = withFirstPartyReviews(product, { count: 0, average: null, reviews: [] }) as any;
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
    expect(withFirstPartyReviews(product, null)).toEqual(product);
  });

  it("whitespace-only name never yields a Review node", () => {
    const ld = withFirstPartyReviews(product, {
      count: 1,
      average: 5,
      reviews: [{ rating: 5, body: "Real body text here", reviewer_name: "   " }],
    }) as any;
    expect(ld.review).toBeUndefined();
    expect(ld.aggregateRating.reviewCount).toBe(1);
  });
});

describe("visible reviews are not selectively suppressed", () => {
  it("keeps every valid 1–5 rating visible", () => {
    const rows = [1, 2, 3, 4, 5].map((rating) => ({ rating }));
    expect(filterVisibleReviews(rows)).toHaveLength(5);
  });
});

describe("public review form and handler require rating and name", () => {
  const form = readFileSync("src/components/reviews/GuestReviewForm.tsx", "utf8");
  const fn = readFileSync("src/lib/reviewsPublic.functions.ts", "utf8");
  it("form starts with no rating and requires explicit star + name", () => {
    expect(form).toContain("useState(0)");
    expect(form).toContain("Choose your rating");
    expect(form).toContain("Escolha a sua classificação");
    expect(form).toMatch(/id="gr-name"\s+required/);
  });
  it("submitPublicReview rejects missing name and keeps moderation", () => {
    const handler = fn.slice(fn.indexOf("export const submitPublicReview"));
    expect(handler).toContain('throw new Error("Please add your name")');
    expect(handler).toContain('moderation_status: "pending"');
    expect(handler).toContain("is_published: false");
    expect(handler).toContain("body.length < 10");
  });
});
