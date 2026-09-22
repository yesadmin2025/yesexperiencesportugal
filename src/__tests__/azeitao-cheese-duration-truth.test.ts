import { describe, expect, it } from "vitest";
import { LOCAL_STORIES_ARTICLES } from "@/content/local-stories-articles";
import { SIGNATURE_SOURCE_OF_TRUTH } from "@/data/signatureToursSourceOfTruth";

const GUIDE_SLUG = "best-wine-tours-from-lisbon";

describe("Azeitão Cheese & Wine factual truth in the wine guide", () => {
  const guide = LOCAL_STORIES_ARTICLES.find((a) => a.slug === GUIDE_SLUG);
  const sot = SIGNATURE_SOURCE_OF_TRUTH["azeitao-cheese"];

  it("has both the guide and the source-of-truth entry", () => {
    expect(guide).toBeTruthy();
    expect(sot).toBeTruthy();
    expect(sot?.durationMinutes).toBe(510);
  });

  it("never describes the Azeitão day as half-day, shorter or back early", () => {
    const azeitaoText = (guide?.sections ?? [])
      .filter((s) => /azeit/i.test(`${s.heading} ${s.body}`))
      .map((s) => `${s.heading} ${s.body}`)
      .join("\n")
      .toLowerCase();

    expect(azeitaoText).not.toContain("half day");
    expect(azeitaoText).not.toContain("half-day");
    expect(azeitaoText).not.toContain("mid-afternoon");
    expect(azeitaoText).not.toContain("back early");
    expect(azeitaoText).not.toMatch(/shorter,? (more focused|tasting-focused)/);
  });

  it("states the canonical ~8h30 duration in the comparison table", () => {
    const row = guide?.comparison?.rows.find((r: string[]) => /Azeitão Cheese/i.test(r[0] ?? ""));
    expect(row).toBeTruthy();
    expect(row?.join(" ")).toMatch(/8h30|8½/);
    expect(row?.join(" ").toLowerCase()).not.toContain("half day");
  });
});
