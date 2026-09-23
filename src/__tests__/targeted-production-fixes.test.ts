import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { signatureTours } from "@/data/signatureTours";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("targeted production fixes", () => {
  it("makes /studio canonical and keeps /studio-v3 as a permanent redirect", () => {
    const studio = read("src/routes/studio.tsx");
    const legacy = read("src/routes/studio-v3.tsx");
    const sitemap = read("src/generated/sitemap-routes.ts");

    expect(studio).toContain('createFileRoute("/studio")');
    expect(studio).toContain("https://yesexperiencesportugal.com/studio");
    expect(legacy).toContain('to: "/studio"');
    expect(legacy).toContain("statusCode: 301");
    expect(sitemap).toContain('{ path: "/studio",');
    expect(sitemap).not.toContain('{ path: "/studio-v3",');
  });

  it("uses the literal brand teal theme color", () => {
    expect(read("src/routes/__root.tsx")).toContain(
      '{ name: "theme-color", content: "#295B61" }',
    );
  });

  it("keeps complete source-backed Sintra & Cascais card facts", () => {
    const sintra = signatureTours.find((tour) => tour.id === "sintra-cascais");
    expect(sintra).toBeDefined();
    expect(sintra?.title).toBeTruthy();
    expect(sintra?.durationHours).toBeTruthy();
    expect(sintra?.priceFrom).toBeGreaterThan(0);

    const homepage = read("src/routes/index.tsx");
    expect(homepage).toContain("MOBILE_TITLE_OVERRIDES[t.id] ?? t.title");
    expect(homepage).toContain("t.rating.toFixed(1)");
    expect(homepage).toContain("signatureDurationLabel(t.id, t.durationHours)");
    expect(homepage).toContain("€{t.priceFrom}");
    expect(homepage).toContain("See dates &amp; reserve");
  });

  it("prefers durable bundled imagery for Signature cards", () => {
    const hook = read("src/hooks/use-imported-tour-images.ts");
    const bundled = hook.indexOf("if (bundled.srcSet) return bundled");
    const remote = hook.indexOf("const live = byUrl.get", bundled);
    expect(bundled).toBeGreaterThan(-1);
    expect(remote).toBeGreaterThan(bundled);
  });

  it("keeps external review totals out of first-party Product review schema", () => {
    const reviews = read("src/components/TourReviews.tsx");
    const schema = read("src/lib/first-party-review-schema.ts");
    expect(reviews).toContain('source.source === "first_party"');
    expect(reviews).toContain("firstPartyStats?.review_count");
    expect(schema).toContain("First-party-only review structured data");
    expect(schema).toContain("first_party_count");
    expect(schema).toContain("never feed `aggregateRating` or `review`");
  });

  it("emits the first page view immediately after analytics consent is granted", () => {
    const consent = read("src/components/CookieConsent.tsx");
    const grant = consent.indexOf('if (full.analytics === "granted")');
    const pageView = consent.indexOf('trackEvent("page_view"', grant);
    expect(grant).toBeGreaterThan(-1);
    expect(pageView).toBeGreaterThan(grant);
  });
});