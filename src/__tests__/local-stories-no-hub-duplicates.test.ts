import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { PUBLISHED_LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";

describe("Local Stories never duplicate a top-level page", () => {
  it("no published guide slug matches an existing top-level route", () => {
    const clashes = PUBLISHED_LOCAL_STORIES_ARTICLES.map((a) => a.slug).filter((slug) =>
      existsSync(`src/routes/${slug}.tsx`),
    );
    expect(clashes).toEqual([]);
  });
});
