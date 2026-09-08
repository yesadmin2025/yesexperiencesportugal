import { describe, expect, it } from "vitest";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { signatureTours } from "@/data/signatureTours";

function article(slug: string) {
  const found = LOCAL_STORIES_ARTICLES.find((a) => a.slug === slug);
  expect(found, `missing article ${slug}`).toBeTruthy();
  return found!;
}

describe("Meta description length locks (snippet quality)", () => {
  it("keeps the Arrábida wine tour description between 120 and 165 characters", () => {
    const tour = signatureTours.find((t) => t.id === "arrabida-wine-allinclusive");
    expect(tour).toBeTruthy();
    const description = tour!.seoDescription ?? "";
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(165);
  });

  it("keeps the Sesimbra guide description between 120 and 165 characters", () => {
    const description = article("what-to-do-in-sesimbra").metaDescription;
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(165);
  });
});

describe("Internal link hygiene in Local Stories", () => {
  const allLinkText = LOCAL_STORIES_ARTICLES.flatMap((a) => [
    ...a.sections.map((s) => s.body),
    ...(a.relatedReads ?? []).map((r) => r.path),
  ]).join("\n");

  it("never renders internal links carrying guide attribution parameters", () => {
    expect(allLinkText).not.toContain("?ref=guide");
    expect(allLinkText).not.toContain("ref_slot");
  });

  it("supports the Arrábida boat experience from the Sesimbra guide", () => {
    const body = article("what-to-do-in-sesimbra")
      .sections.map((s) => s.body)
      .join("\n");
    const occurrences = body.split("](/tours/arrabida-boat)").length - 1;
    expect(occurrences).toBe(1);
  });
});
