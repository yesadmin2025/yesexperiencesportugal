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
  it("does not repeat an image between any curated service or Moments module", () => {
    const modules = [
      CORPORATE_SERVICE_IMAGES,
      PROPOSAL_SERVICE_IMAGES,
      HOMEPAGE_MOMENTS,
      ABOUT_MOMENTS,
      CORPORATE_MOMENTS,
      MULTI_DAY_MOMENTS,
    ];
    const urls = modules.flat().map((photo) => photo.src);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("never restores the retired generated photography", () => {
    const urls = [...CORPORATE_SERVICE_IMAGES, ...PROPOSAL_SERVICE_IMAGES].map(
      (photo) => photo.src,
    );
    expect(urls.join(" ")).not.toMatch(/douro-terraces-golden|alentejo-cork-dawn/);
    expect(urls.join(" ")).not.toMatch(/\/ambient\//);
  });
});