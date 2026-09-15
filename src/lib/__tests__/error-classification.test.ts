import { describe, expect, it } from "vitest";

import { classifyClientError } from "@/lib/error-classification";

describe("client error classification", () => {
  it("marks blocked third-party analytics separately from real incidents", () => {
    expect(
      classifyClientError({
        message: "Failed to fetch https://vitals.vercel-insights.com/v1/vitals",
        hostname: "yesexperiencesportugal.com",
      }),
    ).toBe("third_party_blocked");
  });

  it("marks localhost/dev noise", () => {
    expect(
      classifyClientError({
        message: "[vite] hot updated module failed",
        hostname: "localhost",
      }),
    ).toBe("dev_noise");
  });

  it("marks chunk/asset failures as asset fallback", () => {
    expect(
      classifyClientError({
        message: "Failed to fetch dynamically imported module: /assets/chunk-abc.js",
        hostname: "yesexperiencesportugal.com",
      }),
    ).toBe("asset_fallback");
  });

  it("marks payment and checkout failures critical", () => {
    expect(
      classifyClientError({
        message: "Stripe checkout session could not be created",
        route: "/book",
        hostname: "yesexperiencesportugal.com",
      }),
    ).toBe("critical");
  });

  it("defaults to functional", () => {
    expect(
      classifyClientError({
        message: "Cannot read properties of undefined (reading 'title')",
        hostname: "yesexperiencesportugal.com",
      }),
    ).toBe("functional");
  });
});
