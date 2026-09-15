import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/routes/experiences.tsx"), "utf8");

describe("Experiences editorial collection", () => {
  it("uses the two-column editorial grid and one detail action", () => {
    expect(source).toContain("md:grid-cols-2");
    expect(source).not.toContain("lg:grid-cols-3");
    expect(source).toContain("View experience");
    expect(source).not.toContain('to="/tours/$tourId/tailor"');
  });

  it("keeps cards concise without collection highlight lists", () => {
    expect(source).not.toContain("getSignatureCardMoments");
    expect(source).not.toContain("content.highlights");
    expect(source).toContain("signatureDurationLabel");
    expect(source).toContain("meta.reviewCount");
  });
});