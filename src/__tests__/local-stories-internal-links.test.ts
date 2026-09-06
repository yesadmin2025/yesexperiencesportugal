import { describe, expect, it } from "vitest";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

const TARGET = "/local-stories/best-wine-tours-from-lisbon";

const SOURCE_SLUGS = [
  "best-wine-tasting-near-lisbon",
  "best-wineries-near-lisbon",
  "private-wine-tour-lisbon",
  "arrabida-wine-tour-from-lisbon",
] as const;

function articleBySlug(slug: string) {
  const article = LOCAL_STORIES_ARTICLES.find((a) => a.slug === slug);
  expect(article, `missing article ${slug}`).toBeTruthy();
  return article!;
}

function bodyText(slug: string) {
  return articleBySlug(slug)
    .sections.map((s) => s.body)
    .join("\n");
}

function linkOccurrences(text: string) {
  return text.split(`](${TARGET})`).length - 1;
}

describe("Local Stories internal links to the wine-tours cluster page", () => {
  it.each(SOURCE_SLUGS)("%s links contextually to the wine tours guide", (slug) => {
    const body = bodyText(slug);
    const related = (articleBySlug(slug).relatedReads ?? []).filter((r) => r.path === TARGET);

    expect(linkOccurrences(body)).toBe(1);
    // one link to the target per source article, in total
    expect(linkOccurrences(body) + related.length).toBe(1);
  });

  it("uses varied anchor text, not repeated exact-match anchors", () => {
    const anchors = SOURCE_SLUGS.map((slug) => {
      const match = bodyText(slug).match(/\[([^\]]+)\]\(\/local-stories\/best-wine-tours-from-lisbon\)/);
      expect(match, `no anchor found in ${slug}`).toBeTruthy();
      return match![1]!.toLowerCase();
    });
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("keeps the target article pointing at the Arrábida Wine Signature", () => {
    const target = articleBySlug("best-wine-tours-from-lisbon");
    const body = bodyText("best-wine-tours-from-lisbon");
    expect(target.signatureSlug).toBe("arrabida-wine-allinclusive");
    expect(body).toContain("/tours/arrabida-wine-allinclusive");
  });
});
