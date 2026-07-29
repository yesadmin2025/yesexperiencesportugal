import { describe, expect, it } from "vitest";
import {
  CORPORATE_SERVICE_IMAGES,
  PROPOSAL_SERVICE_IMAGES,
} from "@/content/editorial-service-images";
import {
  ABOUT_MOMENTS,
  CORPORATE_MOMENTS,
  HOMEPAGE_MOMENTS,
  MULTI_DAY_MOMENTS,
} from "@/content/guest-moments";

describe("editorial image identity", () => {
  it("does not repeat an image between public conversion surfaces", () => {
    const conversionModules = [
      CORPORATE_SERVICE_IMAGES,
      PROPOSAL_SERVICE_IMAGES,
      HOMEPAGE_MOMENTS,
      ABOUT_MOMENTS,
    ];
    const urls = conversionModules.flat().map((photo) => photo.src);
    expect(new Set(urls).size).toBe(urls.length);

    // Admin-only moment sets may either mirror their matching service page
    // or stand fully on their own imagery — but never partially overlap,
    // which is what produces "the same photo twice" on a public route.
    const publicUrls = new Set(urls);
    for (const [name, moments] of [
      ["CORPORATE_MOMENTS", CORPORATE_MOMENTS],
      ["MULTI_DAY_MOMENTS", MULTI_DAY_MOMENTS],
    ] as const) {
      const srcs = moments.map((photo) => photo.src);
      expect(new Set(srcs).size, `${name} repeats an image internally`).toBe(srcs.length);
      const shared = srcs.filter((src) => publicUrls.has(src));
      expect(
        shared.length === 0 || shared.length === srcs.length,
        `${name} partially overlaps public conversion imagery`,
      ).toBe(true);
    }
  });

  it("never restores the retired generated photography", () => {
    const urls = [...CORPORATE_SERVICE_IMAGES, ...PROPOSAL_SERVICE_IMAGES].map(
      (photo) => photo.src,
    );
    expect(urls.join(" ")).not.toMatch(/douro-terraces-golden|alentejo-cork-dawn/);
    expect(urls.join(" ")).not.toMatch(/\/ambient\//);
  });
});
