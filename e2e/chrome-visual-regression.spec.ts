import { test, expect, type Page } from "@playwright/test";

/**
 * Chrome visual-regression — navbar + footer.
 *
 * Snapshots a tight clip around each chrome surface in its key states
 * (light/dark, idle/hover/active, mobile menu open). The audit scripts
 * (`scripts/site-brand-audit.mjs`, `scripts/chrome-runtime-contrast.mjs`)
 * prove the *colors* are AA-compliant; this spec proves they actually
 * paint to screen as designed and don't drift from build to build.
 *
 * Snapshot files live next to this spec under
 *   chrome-visual-regression.spec.ts-snapshots/
 * — review diffs in the Playwright HTML report when a check fails.
 *
 * Uses `clip` instead of `fullPage` so the heavy hero image and below-the-
 * fold content don't make these snapshots flake on tiny rendering jitter
 * elsewhere on the page.
 */

const NAVBAR_CLIP_DESKTOP = { x: 0, y: 0, width: 1366, height: 96 };
const NAVBAR_CLIP_MOBILE = { x: 0, y: 0, width: 393, height: 80 };

async function settle(page: Page) {
  // Wait for the header fade-in to finish (900ms via animate-[headerFade]).
  await page.waitForTimeout(1100);
  // Disable animations + caret blink so re-runs are deterministic.
  await page.addStyleTag({
    content: `
      *,*::before,*::after { animation: none !important; transition: none !important; }
      html { caret-color: transparent !important; }
    `,
  });
}

test.describe("Navbar chrome", () => {
  test("light state @ desktop — idle", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");
    await page.goto("/");
    await settle(page);
    await expect(page).toHaveScreenshot("navbar-desktop-idle.png", {
      clip: NAVBAR_CLIP_DESKTOP,
    });
  });

  test("light state @ desktop — link hover", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");
    await page.goto("/");
    await settle(page);
    // Hover the first nav link — should turn teal.
    await page.getByRole("link", { name: "Experiences", exact: true }).first().hover();
    await page.waitForTimeout(350); // colour-transition window
    await expect(page).toHaveScreenshot("navbar-desktop-hover.png", {
      clip: NAVBAR_CLIP_DESKTOP,
    });
  });

  test("light state @ desktop — CTA hover", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");
    await page.goto("/");
    await settle(page);
    await page
      .getByRole("link", { name: /Design\s*&\s*Book/i })
      .first()
      .hover();
    await page.waitForTimeout(550); // 500ms transition
    await expect(page).toHaveScreenshot("navbar-desktop-cta-hover.png", {
      clip: NAVBAR_CLIP_DESKTOP,
    });
  });

  test("active route @ desktop — /about", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");
    await page.goto("/about");
    await settle(page);
    await expect(page).toHaveScreenshot("navbar-desktop-active-about.png", {
      clip: NAVBAR_CLIP_DESKTOP,
    });
  });

  test("mobile bar — idle (logo + hamburger proportion)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");
    await page.goto("/");
    await settle(page);
    await expect(page).toHaveScreenshot("navbar-mobile-idle.png", {
      clip: NAVBAR_CLIP_MOBILE,
    });
  });

  test("mobile menu — open", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(150);
    // Capture the bar + the open drawer below it.
    await expect(page).toHaveScreenshot("navbar-mobile-open.png", {
      clip: { x: 0, y: 0, width: 393, height: 540 },
    });
  });
});

test.describe("Footer chrome", () => {
  test("dark state — idle", async ({ page }) => {
    await page.goto("/about");
    await settle(page);
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await expect(footer).toHaveScreenshot("footer-idle.png");
  });

  test("dark state — link hover (gold-soft on charcoal-deep)", async ({ page }) => {
    await page.goto("/about");
    await settle(page);
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();
    // Hover an experiences column link.
    await footer.getByRole("link", { name: "All Experiences" }).hover();
    await page.waitForTimeout(350);
    await expect(footer).toHaveScreenshot("footer-link-hover.png");
  });

  test("dark state — social icon hover (gold)", async ({ page }) => {
    await page.goto("/about");
    await settle(page);
    const footer = page.locator("footer").first();
    await footer.scrollIntoViewIfNeeded();
    await footer.getByRole("link", { name: "Instagram" }).hover();
    await page.waitForTimeout(350);
    await expect(footer).toHaveScreenshot("footer-social-hover.png");
  });
});
