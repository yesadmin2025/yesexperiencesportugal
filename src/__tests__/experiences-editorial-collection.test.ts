import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/routes/experiences.tsx"), "utf8");

describe("Experiences editorial collection", () => {
  it("uses the two-column editorial grid and a single dominant card action", () => {
    expect(source).toContain("md:grid-cols-2");
    expect(source).not.toContain("lg:grid-cols-3");
    expect(source).toContain("See dates &amp; reserve");
    // P2 conversion contract: one action per card. Tailoring stays on the
    // experience page, not on the collection card.
    expect(source).not.toContain('to="/tours/$tourId/tailor"');
  });

  it("shows the fourth decision fact (who the day suits) from tour data", () => {
    expect(source).toContain("tour.idealFor");
    expect(source).toContain("Ideal for:");
  });

  it("keeps cards concise with collection highlight lists and verified reviews", () => {
    expect(source).not.toContain("getSignatureCardMoments");
    expect(source).toContain("content.highlights");
    expect(source).toContain("signatureDurationLabel");
    expect(source).toContain("verifiedReviewCount");
    expect(source).not.toContain("Lunch included");
    expect(source).not.toContain("<span>Private</span>");
  });
});
