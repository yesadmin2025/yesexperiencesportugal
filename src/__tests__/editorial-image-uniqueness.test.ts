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

    // These legacy admin-only sets intentionally mirror their matching
    // service pages and are not rendered as extra strips on those routes.
    expect(CORPORATE_MOMENTS.map((photo) => photo.src)).toEqual(
      CORPORATE_SERVICE_IMAGES.slice(0, 2).map((photo) => photo.src),
    );
    expect(MULTI_DAY_MOMENTS.map((photo) => photo.src)).toEqual(
      PROPOSAL_SERVICE_IMAGES.slice(1).concat(PROPOSAL_SERVICE_IMAGES[0]).map((photo) => photo.src),
    );
  });

  it("never restores the retired generated photography", () => {
    const urls = [...CORPORATE_SERVICE_IMAGES, ...PROPOSAL_SERVICE_IMAGES].map(
      (photo) => photo.src,
    );
    expect(urls.join(" ")).not.toMatch(/douro-terraces-golden|alentejo-cork-dawn/);
    expect(urls.join(" ")).not.toMatch(/\/ambient\//);
  });
});