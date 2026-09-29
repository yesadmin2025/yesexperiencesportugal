import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorialSources } from "@/components/journal/EditorialSources";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

describe("editorial verification", () => {
  it("keeps references optional, small, human-readable and safe in a new tab", () => {
    expect(renderToStaticMarkup(<EditorialSources />)).toBe("");
    const sources = LOCAL_STORIES_ARTICLES.flatMap((article) => article.sections.flatMap((section) => section.sources ?? []));
    expect(sources.length).toBeGreaterThan(0);
    for (const article of LOCAL_STORIES_ARTICLES) {
      for (const section of article.sections) {
        expect(section.sources?.length ?? 0).toBeLessThanOrEqual(3);
        for (const source of section.sources ?? []) {
          expect(source.url).toMatch(/^https:\/\/[^\s]+$/);
          expect(source.label).toMatch(/^(UNESCO|DGADR) — /);
        }
      }
    }
    const html = renderToStaticMarkup(<EditorialSources sources={sources.slice(0, 1)} />);
    expect(html).toContain("Sources &amp; context");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("DGADR");
  });
});