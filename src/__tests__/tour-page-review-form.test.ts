/**
 * Tour page guest review form — structural locks.
 *
 * The form must be present on every Signature tour page, locked to that
 * tour, and submissions must stay unpublished until moderated. Nothing here
 * changes pricing, booking or schema behaviour.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("tour page review form", () => {
  const route = read("src/routes/tours.$tourId.tsx");
  const form = read("src/components/reviews/GuestReviewForm.tsx");
  const publicFns = read("src/lib/reviewsPublic.functions.ts");
  const list = read("src/components/TourReviews.tsx");

  it("renders the guest review form on the tour page, locked to that tour", () => {
    expect(route).toContain(
      'import { GuestReviewForm } from "@/components/reviews/GuestReviewForm"',
    );
    expect(route).toContain("<GuestReviewForm lockedTour={{ tour_id: tour.id, title: tour.title }} />");
  });

  it("hides the experience picker when a tour is locked", () => {
    expect(form).toContain("lockedTour?: TourOption");
    expect(form).toContain("{lockedTour ? (");
    expect(form).toContain("{t.reviewing}");
  });

  it("links from the visible review list to the form", () => {
    expect(list).toContain('href="#leave-a-review"');
  });

  it("keeps submissions unpublished and pending moderation", () => {
    expect(publicFns).toContain("is_published: false");
    expect(publicFns).toContain('moderation_status: "pending"');
    expect(publicFns).toContain("is_first_party: true");
    expect(publicFns).toContain("verified: false");
  });
});
