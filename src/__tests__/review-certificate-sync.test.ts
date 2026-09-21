import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { organizationLd, localBusinessLd } from "@/lib/jsonld";

/**
 * Review certificate guard.
 *
 * Owned pages may show the verified Trustindex certificate in UI, but the
 * site's own Organization/LocalBusiness entities must not carry a
 * self-serving aggregateRating. Tour/Product ratings are guarded elsewhere.
 */
describe("review certificate policy", () => {
  it("organizationLd emits no self-serving aggregateRating", () => {
    const ld = organizationLd() as Record<string, unknown>;
    expect(ld.aggregateRating).toBeUndefined();
  });

  it("localBusinessLd emits no self-serving aggregateRating", () => {
    const ld = localBusinessLd({
      path: "/day-trips-from-lisbon",
      name: "YES Experiences Portugal — day trips from Lisbon",
      description: "Private day trips from Lisbon.",
      areaServed: ["Lisbon", "Sesimbra"],
    }) as Record<string, unknown>;
    expect(ld.aggregateRating).toBeUndefined();
  });

  it("footer badge reads the shared visible certificate source", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/trust/TrustindexBadge.tsx"),
      "utf8",
    );
    expect(src).toContain("@/config/trust-certificate");
    expect(src).not.toMatch(/const RATING = "\\d/);
  });
});
