import baseConfig from "./playwright.config";
import { defineConfig, devices } from "@playwright/test";

// Film playback requires an H.264-capable browser. Playwright's bundled
// open-source Chromium may lack proprietary-codec support on Linux runners.
// Use real Google Chrome ONLY for the film tests. Other E2E workflows retain
// the established Chromium matrix and the same assertions.
//
// Do not pass baseConfig and the override as two arguments to defineConfig:
// Playwright concatenates their "projects" arrays. That accidentally ran
// film playback on the four generic Chromium projects as well as Chrome,
// resulting in a misleading 36-test failure matrix instead of 12 Chrome tests.
// A single config with an explicit projects replacement preserves every
// assertion while ensuring these tests use only the intended browser.
export default defineConfig({
  ...baseConfig,
  projects: [
    {
      name: "hero-film-chrome-mobile",
      use: {
        ...devices["Pixel 5"],
        channel: "chrome",
        launchOptions: undefined,
      },
    },
    {
      name: "hero-film-chrome-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        channel: "chrome",
        launchOptions: undefined,
      },
    },
  ],
});
