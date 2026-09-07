import React from "react";
import { describe, expect, it } from "vitest";
import { renderBodyWithTourLinks } from "@/routes/local-stories.$slug";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

function linksFrom(text: string) {
  return renderBodyWithTourLinks(text).filter((node): node is React.ReactElement =>
    React.isValidElement(node),
  );
}

describe("renderBodyWithTourLinks", () => {
  it("turns /tours/ markdown links into tour Link elements", () => {
    const links = linksFrom(
      "A private [wine tour from Lisbon](/tours/arrabida-wine-allinclusive) awaits.",
    );
    expect(links).toHaveLength(1);
    expect(links[0].props.to).toBe("/tours/$tourId");
    expect(links[0].props.params).toEqual({ tourId: "arrabida-wine-allinclusive" });
  });

  it("turns /local-stories/ markdown links into story Link elements (no raw markdown left)", () => {
    const text =
      "Read our guide to [wine tours from Lisbon](/local-stories/best-wine-tours-from-lisbon).";
    const nodes = renderBodyWithTourLinks(text);
    const links = nodes.filter((n): n is React.ReactElement => React.isValidElement(n));
    expect(links).toHaveLength(1);
    expect(links[0].props.to).toBe("/local-stories/$slug");
    expect(links[0].props.params).toEqual({ slug: "best-wine-tours-from-lisbon" });
    const textNodes = nodes.filter((n) => typeof n === "string").join("");
    expect(textNodes).not.toContain("](");
    expect(textNodes).not.toContain("/local-stories/");
  });

  it("leaves no raw markdown in any published article body", () => {
    for (const article of LOCAL_STORIES_ARTICLES) {
      for (const section of article.sections) {
        const textNodes = renderBodyWithTourLinks(section.body)
          .filter((n) => typeof n === "string")
          .join("");
        expect(
          /\[[^\]]+\]\(\/[a-z-]+\/[a-z0-9-]+\)/.test(textNodes),
          `${article.slug} renders raw markdown`,
        ).toBe(false);
      }
    }
  });
});
