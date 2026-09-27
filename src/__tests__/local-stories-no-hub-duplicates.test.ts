import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { PUBLISHED_LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

describe("Local Stories never duplicate a top-level page", () => {
  it("no published guide slug matches a top-level content route", () => {
    const clashes = PUBLISHED_LOCAL_STORIES_ARTICLES.map((a) => a.slug).filter((slug) => {
      const file = `src/routes/${slug}.tsx`;
      if (!existsSync(file)) return false;
      // Redirect-only aliases that point at the guide are fine.
      return !/throw redirect\(/.test(readFileSync(file, "utf8"));
    });
    expect(clashes).toEqual([]);
  });
});
