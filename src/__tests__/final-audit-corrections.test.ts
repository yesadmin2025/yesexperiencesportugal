import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("final audit corrections", () => {
  it("keeps Studio represented by the navbar CTA, not a duplicate primary text link", () => {
    const src = read("src/components/Navbar.tsx");
    const primaryLinksBody = src.match(/function usePrimaryLinks\(\)[\s\S]*?return \[([\s\S]*?)\];/)?.[1] ?? "";

    expect(primaryLinksBody).not.toContain("/studio");
    expect(src).toContain('<CtaButton to="/studio"');
    expect(src).toContain("Design your day");
  });

  it("keeps /book instant mode free of the generic price catalogue", () => {
    const src = read("src/routes/book.tsx");
    expect(src).toMatch(/\{!instantMode \? \(\s*<section\s+id="prices"/);
    expect(src).toContain('data-testid="booking-price-list"');
  });

  it("uses discovery vocabulary on generic /book and reserve vocabulary for specific tour actions", () => {
    const src = read("src/routes/book.tsx");
    expect(src).toContain("CTA_LABELS.signatureDiscovery");
    expect(src).not.toContain("Book instantly");
    expect(src).toContain("Reserve this day →");
    expect(src).not.toContain("Book →");
  });

  it("prevents area pages from silently selecting the first tour before the guest chooses", () => {
    const src = read("src/components/seo/AreaLandingPage.tsx");
    expect(src).not.toContain("bookSearch");
    expect(src).toContain('href="#signature-days"');
    expect(src).toContain('id="signature-days"');
    expect(src).toContain("CTA_LABELS.signatureDiscoveryCompact");
    const heroTracking = src.match(/placement: `area:\$\{page\.area\}:hero`[\s\S]{0,200}/)?.[0] ?? "";
    expect(heroTracking).not.toContain("experience_id");
    expect(src).toContain("Reserve this day · from €{tour.priceFrom}");
  });

  it("prevents region pages from silently selecting the first tour before the guest chooses", () => {
    const src = read("src/components/seo/RegionListingPage.tsx");
    expect(src).not.toContain("bookSearch");
    expect(src).not.toContain("first day");
    expect(src).toContain('href="#signature-days"');
    expect(src).toContain('id="signature-days"');
    expect(src).toContain("CTA_LABELS.signatureDiscoveryCompact");
    const heroTracking = src.match(/placement: `region:\$\{region\.path\}:hero`[\s\S]{0,200}/)?.[0] ?? "";
    const reserveTracking = src.match(/placement: `region:\$\{region\.path\}:reserve-panel`[\s\S]{0,200}/)?.[0] ?? "";
    expect(heroTracking).not.toContain("experience_id");
    expect(reserveTracking).not.toContain("experience_id");
    expect(src).toContain("Reserve this day · from €{tour.priceFrom}");
  });

  it("keeps day-trips generic reserve panel away from generic request mode", () => {
    const src = read("src/routes/day-trips-from-lisbon.tsx");
    expect(src).toContain('id="signature-days"');
    expect(src).toContain('href="#signature-days"');
    expect(src).toContain("CTA_LABELS.signatureDiscoveryCompact");
    expect(src).not.toContain('<CtaButton to="/book">Book &amp; pay online</CtaButton>');
    expect(src).toContain("Reserve this day · from €{tour.priceFrom}");
  });

  it("uses the public review certificate source for the global reviews header proof", () => {
    const src = read("src/routes/reviews.tsx");
    expect(src).toContain('from "@/config/trust-certificate"');
    expect(src).toContain("REVIEW_COUNT_DISPLAY");
    expect(src).toContain("REVIEW_CERTIFICATE.ratingValue");
    expect(src).not.toContain("global.total_reviews");
    expect(src).not.toContain("global.average_rating");
  });

  it("keeps the FAQ public header free of decorative dividers", () => {
    const src = read("src/routes/faq.tsx");
    const headerBlock = src.match(/<section className="page-hero[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(headerBlock).not.toContain("gold-divider");
  });

  it("removes the duplicate Private Groups corporate footer link", () => {
    const src = read("src/components/Footer.tsx");
    expect(src).not.toContain("Private Groups");
    expect(src).toContain('{ to: "/proposal-in-portugal", label: "Moments" }');
    expect(src).toContain('{ to: "/corporate", label: "Corporate" }');
  });
});