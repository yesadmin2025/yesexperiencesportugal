import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import { organizationLd } from "@/lib/jsonld";

/**
 * Google requires the rating in markup to be visible on the page.
 * The footer badge and the Organization aggregateRating must therefore
 * always read the same single source of truth.
 */
describe("review certificate ↔ JSON-LD sync", () => {
  it("organization aggregateRating mirrors the certificate constants", () => {
    const ld = organizationLd() as Record<string, any>;
    expect(ld.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: REVIEW_CERTIFICATE.ratingValue,
      bestRating: REVIEW_CERTIFICATE.bestRating,
      worstRating: REVIEW_CERTIFICATE.worstRating,
      reviewCount: REVIEW_CERTIFICATE.reviewCount,
    });
  });

  it("footer badge hard-codes no rating of its own", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/trust/TrustindexBadge.tsx"),
      "utf8",
    );
    expect(src).toContain("@/config/trust-certificate");
    expect(src).not.toMatch(/const RATING = "\d/);
  });
});
