import { describe, expect, it } from "vitest";

import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { SIGNATURE_TOURS_SOURCE_OF_TRUTH } from "@/data/signatureToursSourceOfTruth";

const SLUG = "azeitao-cheese-workshop-near-lisbon";

describe("Azeitão cheese workshop guide", () => {
  const article = LOCAL_STORIES_ARTICLES.find((a) => a.slug === SLUG);
  const sot = SIGNATURE_TOURS_SOURCE_OF_TRUTH["azeitao-cheese"];
  const text = article
    ? [
        article.standfirst,
        ...article.sections.map((s) => `${s.heading} ${s.body}`),
        ...(article.faq ?? []).map((f) => `${f.q} ${f.a}`),
      ].join("\n")
    : "";

  it("exists and links the real Signature", () => {
    expect(article).toBeDefined();
    expect(article!.signatureSlug).toBe("azeitao-cheese");
    expect(sot).toBeDefined();
  });

  it("states the real duration", () => {
    expect(sot.durationText).toBe("8h30");
    expect(text).toContain("8h30");
    expect(text).not.toMatch(/eight to nine hours/i);
  });

  it("states that lunch is not included", () => {
    expect(text).toMatch(/lunch is not included|Lunch is at your own expense/i);
    expect(text).not.toMatch(/lunch included|included lunch on this day/i);
  });

  it("only references stops that exist in the real itinerary", () => {
    for (const needle of ["Livramento", "Quinta Velha", "Catralvos", "Sesimbra"]) {
      expect(sot.itinerary.some((s) => s.name.includes(needle.split(" ")[0]!))).toBe(true);
      expect(text).toContain(needle);
    }
  });

  it("uses only real related Signature ids", () => {
    for (const related of article!.relatedSignatures ?? []) {
      expect(SIGNATURE_TOURS_SOURCE_OF_TRUTH[related.slug]).toBeDefined();
    }
  });
});
