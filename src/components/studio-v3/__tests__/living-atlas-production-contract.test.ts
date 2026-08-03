import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Living Atlas production promotion contract", () => {
  it("mounts Living Atlas in the public Experience Studio", () => {
    const publicPage = source("../StudioExperiencePage.tsx");
    expect(publicPage).toContain("LivingAtlasJourneyPreview");
    expect(publicPage).not.toContain("<StudioV3 />");
  });

  it("uses the configured Stripe environment rather than a forced sandbox", () => {
    const booking = source("../LivingAtlasBookingStep.tsx");
    expect(booking).toContain("getStripeEnvironment()");
    expect(booking).not.toContain('environment: "sandbox"');
    expect(booking).not.toContain("Stripe sandbox");
  });

  it("does not expose preview or sandbox copy to customers", () => {
    const journey = source("../LivingAtlasJourneyPreview.tsx");
    expect(journey).not.toContain("sandbox-only");
    expect(journey).not.toContain("opens Stripe sandbox only");
    expect(journey).toContain("YES Experience Studio · Living Atlas");
  });

  it("redirects the historical preview URL to the canonical Studio", () => {
    const previewRoute = source("../../../routes/studio-living-atlas-preview.tsx");
    expect(previewRoute).toContain('to: "/experience-studio"');
    expect(previewRoute).toContain("statusCode: 301");
  });
});
