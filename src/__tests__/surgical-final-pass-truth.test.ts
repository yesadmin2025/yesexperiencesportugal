import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { findTour } from "@/data/signatureTours";

const read = (path: string) => readFileSync(path, "utf8");

describe("surgical final-pass truth locks", () => {
  it("keeps the protected wine guide metadata and states the Azeitão lunch truth", () => {
    const guide = LOCAL_STORIES_ARTICLES.find(
      (article) => article.slug === "best-wine-tours-from-lisbon",
    );
    expect(guide?.title).toBe("The Best Private Wine Tours from Lisbon (2026 Expert Guide)");
    expect(guide?.h1).toBe("The Best Wine Tours from Lisbon");
    const body = guide?.sections.map((section) => section.body).join("\n") ?? "";
    expect(body).toContain("hands-on local craft and food day");
    expect(body).toContain("private cheese workshop, one winery, Azeitão and Sesimbra");
    expect(body).toContain("does not include lunch");
    expect(body).not.toContain("Choose Azeitão if tasting time matters more than scenery");
  });

  it("uses the complete owned brand name in the Arrábida operator statement", () => {
    const arrabida = findTour("arrabida-wine-allinclusive");
    expect(arrabida?.contextParagraph).toContain(
      "YES Experiences Portugal is a licensed Portuguese tour operator",
    );
    expect(arrabida?.contextParagraph).not.toContain("YES experiences is");
  });

  it("labels platform and direct review proof without changing schema boundaries", () => {
    const route = read("src/routes/tours.$tourId.tsx");
    const reviews = read("src/components/TourReviews.tsx");
    expect(route).toContain("reviews across platforms");
    expect(reviews).toContain("Reviews collected directly by YES");
    expect(route).toContain("withFirstPartyReviews");
    expect(route).not.toMatch(/aggregateRating.*meta\.rating/s);
  });

  it("has only GTM as the analytics loader", () => {
    const root = read("src/routes/__root.tsx");
    expect(root).toContain("GTM-M82SQS79");
    expect(root).not.toContain("gtag/js?id=");
  });
});