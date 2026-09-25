import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/routes/experiences.tsx"), "utf8");

describe("Experiences editorial collection", () => {
  it("uses an aligned two-column decision grid with reserve + tailor actions", () => {
    expect(source).toContain("md:grid-cols-2");
    expect(source).not.toContain("lg:grid-cols-3");
    expect(source).toContain("CTA_LABELS.signatureCardBooking");
    expect(source).toContain('to="/tours/$tourId/tailor"');
    expect(source).toContain("CTA_LABELS.tailor");
  });

  it("prioritises three canonical decision highlights without a secondary Ideal for line", () => {
    expect(source).toContain("getSignatureCardHighlights(tour.id)");
    expect(source).not.toContain("tour.idealFor");
    expect(source).not.toContain("Ideal for:");
  });

  it("keeps cards concise with collection highlight lists and verified reviews", () => {
    expect(source).toContain("getSignatureCardHighlights");
    expect(source).toContain("canonicalContent.highlights");
    expect(source).toContain("signatureDurationLabel");
    expect(source).toContain("verifiedReviewCount");
    expect(source).not.toContain("<span>Private</span>");
  });

  it("uses one shared metadata structure in rating, duration, location order", () => {
    expect(source).toContain("function ExperienceCardMeta");
    expect(source).toMatch(
      /<ExperienceCardMeta[\s\S]*?rating=\{verifiedRating\}[\s\S]*?reviewCount=\{verifiedReviewCount\}[\s\S]*?duration=\{signatureDurationLabel[\s\S]*?location=\{tour\.region\}/,
    );
    expect(source.indexOf("{hasReviews ? (")).toBeLessThan(source.indexOf("{duration ? <span>{duration}</span> : null}"));
    expect(source.indexOf("{duration ? <span>{duration}</span> : null}")).toBeLessThan(source.indexOf("{location ? <span>{location}</span> : null}"));
  });
  it("renders the source-controlled catalogue immediately, without a blocking loader or reveal gate", () => {
    expect(source).not.toContain("loader: async () => ({ contentOverrides");
    expect(source).toContain("useState<ExperienceContentOverride[]>([])");
    expect(source).toContain("void listPublishedExperienceContent()");
    expect(source).not.toContain('className="reveal section-y bg-[color:var(--ivory)]');
    expect(source).not.toContain("<Scene className=");
    expect(source).toContain('<div className="experiences-editorial-grid');
  });

});
