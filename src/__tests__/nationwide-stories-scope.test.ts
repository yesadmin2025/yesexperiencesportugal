import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  consolidatedLocalStoryTarget,
  isRetiredLocalStorySlug,
  PUBLISHED_LOCAL_STORIES_ARTICLES,
} from "@/content/local-stories-articles";

const source = (path: string) => readFileSync(path, "utf8");

describe("nationwide journeys and Local Stories", () => {
  it("presents sample durations as examples, not a product limit", () => {
    const designer = source("src/routes/portugal-travel-designer.tsx");
    const planning = source("src/routes/how-many-days-in-portugal.tsx");
    expect(designer).toContain("last as long as your journey calls");
    expect(designer).not.toContain("7, 10 or 14 Days");
    expect(planning).toContain("not packages or limits");
  });

  it("retires the duplicate Évora guide without losing its inbound links", () => {
    expect(isRetiredLocalStorySlug("evora-private-tour-from-lisbon")).toBe(true);
    expect(consolidatedLocalStoryTarget("evora-private-tour-from-lisbon")).toBe(
      "alentejo-wine-tour-from-lisbon",
    );
    expect(PUBLISHED_LOCAL_STORIES_ARTICLES.some((a) => a.slug === "evora-private-tour-from-lisbon")).toBe(false);
  });

  it("keeps single-day Studio language separate from flexible editorial enquiries", () => {
    const index = source("src/routes/local-stories.index.tsx");
    const detail = source("src/routes/local-stories.$slug.tsx");
    expect(index).toContain("Design my experience");
    expect(index).not.toContain('to="/studio"');
    expect(detail).toContain('search={{ type: "other", place: article.h1 }}');
    expect(detail).toContain("!GUIDE_INLINE_BOOKING[article.slug] && article.relatedSignatures");
  });
});