import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  organizationLd,
  localBusinessLd,
} from "@/lib/jsonld";

/**
 * Validates that the sitewide Organization / LocalBusiness JSON-LD
 * contains the licence, service areas, address, phone, hours and booking
 * action required for the Google Business Profile and Rich Results.
 *
 * These tests run against the actual helper output so a schema change
 * fails the build immediately.
 */

describe("Organization / LocalBusiness structured data", () => {
  const org = organizationLd();

  it("Organization declares both TravelAgency and LocalBusiness types", () => {
    expect(org["@type"]).toContain("TravelAgency");
    expect(org["@type"]).toContain("LocalBusiness");
  });

  it("Organization includes RNAAT licence identifier", () => {
    expect(org.identifier).toMatchObject({
      "@type": "PropertyValue",
      propertyID: "RNAAT",
      value: "nº 31/2023",
    });
  });

  it("Organization lists all nine GBP service areas plus Portugal", () => {
    const served = (org.areaServed as readonly { name: string }[]).map((a) => a.name);
    expect(served).toContain("Portugal");
    [
      "Lisbon",
      "Cascais",
      "Sintra",
      "Sesimbra",
      "Setúbal",
      "Azeitão",
      "Évora",
      "Comporta",
      "Tróia",
    ].forEach((city) => expect(served).toContain(city));
  });

  it("Organization has Sesimbra address and geo coordinates", () => {
    expect(org.address).toMatchObject({
      "@type": "PostalAddress",
      addressLocality: "Sesimbra",
      addressRegion: "Setúbal",
      addressCountry: "PT",
    });
    expect(org.ge).toMatchObject({
      "@type": "GeoCoordinates",
      latitude: 38.4438,
      longitude: -9.1016,
    });
  });

  it("Organization publishes phone and daily 08:00-20:00 opening hours", () => {
    expect(org.telephone).toBe("+351911889992");
    expect(org.openingHoursSpecification).toHaveLength(1);
    const spec = org.openingHoursSpecification[0];
    expect(spec.opens).toBe("08:00");
    expect(spec.closes).toBe("20:00");
    expect(spec.dayOfWeek).toContain("Monday");
    expect(spec.dayOfWeek).toContain("Sunday");
  });

  it("Organization includes a ReserveAction booking link", () => {
    expect(org.potentialAction).toMatchObject({
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://yesexperiencesportugal.com/book",
      },
    });
  });

  it("__root.tsx emits Organization and WebSite JSON-LD", () => {
    const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");
    expect(root).toMatch(/jsonLdScript\(\s*organizationLd\(\)\s*\)/);
    expect(root).toMatch(/jsonLdScript\(\s*websiteLd\(\)\s*\)/);
  });

  it("LocalBusiness pages include a ReserveAction and the canonical NAP", () => {
    const lb = localBusinessLd({
      path: "/private-tours-arrabida-sesimbra",
      name: "YES Experiences Portugal — Arrábida & Sesimbra",
      description: "Private wine tours from Lisbon to Arrábida and Sesimbra.",
      areaServed: ["Lisbon", "Sesimbra", "Setúbal", "Azeitão", "Cascais"],
    });
    expect(lb["@type"]).toContain("LocalBusiness");
    expect(lb.parentOrganization).toMatchObject({
      "@id": "https://yesexperiencesportugal.com/#organization",
    });
    expect(lb.telephone).toBe("+351911889992");
    expect(lb.address.addressLocality).toBe("Sesimbra");
    expect(lb.potentialAction).toMatchObject({
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://yesexperiencesportugal.com/book",
      },
    });
  });

  it("Region pages emit localBusinessLd JSON-LD", () => {
    const regionFiles = [
      "src/routes/private-tours-arrabida-sesimbra.tsx",
      "src/routes/private-tours-azeitao-setubal.tsx",
      "src/routes/private-tours-sintra-cascais.tsx",
      "src/routes/private-tours-alentejo-evora.tsx",
      "src/routes/private-tours-comporta-troia.tsx",
      "src/routes/private-tours-centro-silver-coast.tsx",
    ];
    for (const file of regionFiles) {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(src).toMatch(/jsonLdScript\(\s*localBusinessLd\(/);
    }
  });
});
