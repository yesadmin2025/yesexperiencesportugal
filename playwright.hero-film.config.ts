import baseConfig from "./playwright.config";
import { defineConfig, devices } from "@playwright/test";

// Film playback needs Google Chrome's H.264 support, never bundled Chromium.
// The spec itself runs real desktop 1280x720 AND mobile 393x851 viewports
// with test.use(). A second browser project repeated these identical cases
// and overloaded constrained CI workers without adding viewport coverage.
export default defineConfig({
  ...baseConfig,
  projects: [
    {
      name: "hero-film-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        // Prevent the inherited Chromium executable override from winning.
        launchOptions: {},
      },
    },
  ],
});
