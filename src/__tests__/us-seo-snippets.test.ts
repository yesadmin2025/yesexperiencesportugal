import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { DESTINATION_FAQ_BY_ID, WINE_TOUR_FAQ_BY_ID, getFaqForTour } from "@/content/seo-faq";
import { SIGNATURE_SEO } from "@/content/signature-seo";

/**
 * Snippet quality locks for the US market: Google truncates titles past ~60
 * characters and descriptions past ~165, and a short description wastes the
 * snippet. These ranges keep every Signature tour readable in US results.
 */
describe("Signature snippet lengths stay inside Google's US display window", () => {
  for (const tour of signatureTours) {
    it(`${tour.id} has a 45–62 character title and a 120–165 character description`, () => {
      const title = SIGNATURE_SEO[tour.id]?.title ?? tour.seoTitle ?? tour.title;
      expect(title.length).toBeGreaterThanOrEqual(45);
      expect(title.length).toBeLessThanOrEqual(62);

      const description = SIGNATURE_SEO[tour.id]?.description ?? tour.seoDescription ?? "";
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(165);
    });
  }
});

describe("Every Signature has a unique US purchase-intent target", () => {
  it("covers the complete live catalogue without duplicate snippets", () => {
    const ids = signatureTours.map((tour) => tour.id);
    expect(Object.keys(SIGNATURE_SEO).sort()).toEqual([...ids].sort());
    expect(new Set(ids.map((id) => SIGNATURE_SEO[id]?.title)).size).toBe(ids.length);
    expect(new Set(ids.map((id) => SIGNATURE_SEO[id]?.description)).size).toBe(ids.length);
    expect(new Set(ids.map((id) => SIGNATURE_SEO[id]?.primaryKeyword)).size).toBe(ids.length);
  });

  for (const tour of signatureTours) {
    it(`${tour.id} names a real primary query and supporting intent`, () => {
      const seo = SIGNATURE_SEO[tour.id];
      expect(seo).toBeTruthy();
      expect(seo?.primaryKeyword.length).toBeGreaterThan(5);
      expect(seo?.supportingKeywords.length).toBeGreaterThanOrEqual(2);
    });
  }
});

describe("Every Signature tour ships its own US-intent FAQ overlay", () => {
  for (const tour of signatureTours) {
    it(`${tour.id} answers destination-specific questions before the shared FAQ`, () => {
      const overlay = WINE_TOUR_FAQ_BY_ID[tour.id] ?? DESTINATION_FAQ_BY_ID[tour.id] ?? [];
      expect(overlay.length).toBeGreaterThanOrEqual(2);
      // Overlay questions must lead the FAQPage schema so the specific answer
      // is the one Google can surface as a rich result.
      const faq = getFaqForTour(tour.id);
      expect(faq[0]?.q).toBe(overlay[0]?.q);
      for (const item of overlay) {
        expect(item.a.length).toBeGreaterThan(60);
      }
    });
  }
});
