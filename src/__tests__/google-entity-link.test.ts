/**
 * Google entity-link guardrail.
 *
 * Locks the canonical Google Business Profile share URL supplied by the
 * owner into the public Organization / TravelAgency structured data, and
 * ensures the obsolete Rua Central do Meco listing (old short link, old
 * phone, old email, old street) is never emitted by public JSON-LD.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { organizationLd, localBusinessLd } from "@/lib/jsonld";
import { SOCIAL, STRUCTURED_ADDRESS } from "@/config/business-nap";

/** Verified 8 Oct 2026 via the Business Profile API (locations/900772565940911174). */
const CANONICAL_GOOGLE_PROFILE = "https://maps.google.com/maps?cid=18112725515561598058";

/** Stale third-party identity that must never appear in public structured data. */
const STALE_ENTITY_SIGNALS = [
  "maps.app.goo.gl/hbVa3Yw2mDV2DZHt8",
  "Rua Central do Meco",
  "912839500",
  "+351 912 839 500",
  "info@yesexperiences.pt",
];

function structuredDataText(): string {
  return JSON.stringify([organizationLd(), websiteAndLocalBusinessSample()]);
}

function websiteAndLocalBusinessSample() {
  return localBusinessLd({
    path: "/private-tours-arrabida-sesimbra",
    name: "YES Experiences Portugal — Arrábida & Sesimbra",
    description: "Private wine tours from Lisbon to Arrábida and Sesimbra.",
    areaServed: ["Lisbon", "Sesimbra"],
  });
}

describe("Canonical Google Business Profile entity link", () => {
  it("SOCIAL.google is exactly the owner-supplied canonical share URL", () => {
    expect(SOCIAL.google).toBe(CANONICAL_GOOGLE_PROFILE);
  });

  it("Organization sameAs carries the verified Google Business Profile URL", () => {
    const org = organizationLd();
    expect(org.sameAs).toContain(CANONICAL_GOOGLE_PROFILE);
    expect(org.sameAs).toContain(SOCIAL.instagram);
    // Stale short links and the old Meco Maps link must never appear.
    expect(org.sameAs).not.toContain("share.google/");
    expect(org.sameAs).not.toContain("maps.app.goo.gl/hbVa3Yw2mDV2DZHt8");
  });

  it("emits the current official NAP, not the obsolete Meco listing", () => {
    const text = structuredDataText();
    expect(text).toContain("+351911889992");
    expect(text).toContain("info@yesexperiencesportugal.com");
    expect(JSON.parse(JSON.stringify(STRUCTURED_ADDRESS))).toMatchObject({
      streetAddress: "Avenida 25 de Abril",
      postalCode: "2970-130",
      addressLocality: "Sesimbra",
    });
    for (const stale of STALE_ENTITY_SIGNALS) {
      expect(text).not.toContain(stale);
    }
  });

  it("jsonld.ts source never hard-codes a Google profile URL or Meco address", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/jsonld.ts"), "utf8");
    expect(src).not.toContain("maps.app.goo.gl");
    expect(src).not.toContain("share.google/");
    expect(src).not.toMatch(/Rua Central do Meco/i);
    expect(src).not.toContain("912839500");
    expect(src).not.toContain("info@yesexperiences.pt");
  });
});
