import { test, expect, type Page } from "@playwright/test";

/**
 * Mobile-only visual regression for logo proportions.
 *
 * Verifies that the footer logo renders at the *visually-matched* size of
 * the navbar logo across every common mobile breakpoint. The two source
 * PNGs have identical pixel dimensions (909×579) but the gold-on-charcoal
 * variant optically blooms against the dark surface, so the CSS system
 * scales it by `--logo-scale-gold-on-charcoal` (default 0.95) to make the
 * stroke mass match. This spec is the guardrail that proves the
 * compensation actually lands on screen at every viewport size.
 *
 * What we assert:
 *   1. Both logos have the same bounding-box ASPECT RATIO (the artwork
 *      isn't being squashed differently in either chrome).
 *   2. The footer logo's rendered HEIGHT is the navbar logo's height
 *      multiplied by the expected scale token, within ±1.5px tolerance
 *      (sub-pixel rounding budget — anything more would be a real drift).
 *   3. The Tailwind height class (`h-[60px]/h-[64px]/h-[68px]`) actually
 *      resolves at the right breakpoint — i.e. the responsive ladder is
 *      wired in both components, not just one.
 *
 * We measure via `getBoundingClientRect` rather than pixel diffs — it's
 * deterministic, doesn't require checked-in baselines, and gives a
 * descriptive failure message ("footer logo is 12px taller than expected")
 * instead of a vague "image differs by 0.4%".
 */

// Mobile breakpoints to cover. iPhone SE (small) → Pixel 5 (mid) →
// iPhone 12/13 (tall). 768 sits at the md boundary so we catch the
// transition into the md ladder. Anything ≥1024 is desktop and not
// covered by this mobile-only spec.
const MOBILE_BREAKPOINTS = [
  { name: "iPhone SE", width: 375, height: 667, expectedNavH: 60 }, // < md → 60px
  { name: "Pixel 5", width: 393, height: 851, expectedNavH: 60 }, // < md → 60px
  { name: "iPhone 12", width: 390, height: 844, expectedNavH: 60 }, // < md → 60px
  { name: "iPad portrait", width: 768, height: 1024, expectedNavH: 64 }, // md → 64px
] as const;

// Must match `--logo-scale-gold-on-charcoal` in src/styles.css.
const EXPECTED_GOLD_SCALE = 0.95;
// Sub-pixel rounding budget. The CSS scale lands on a non-integer height
// (e.g. 64 × 0.95 = 60.8), so we allow 1.5px of slop. Anything bigger is
// a real layout regression.
const HEIGHT_TOLERANCE_PX = 1.5;
// Aspect-ratio tolerance — both PNGs are 909×579 ≈ 1.5699. Even the
// scaled variant should be within 0.5% of that ratio.
const ASPECT_TOLERANCE = 0.008;

async function settle(page: Page) {
  await page.waitForTimeout(900); // header fade-in
  await page.addStyleTag({
    content: `*,*::before,*::after { animation: none !important; transition: none !important; }`,
  });
}

async function measureLogo(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`Logo not found: ${selector}`);
  return { width: box.width, height: box.height, aspect: box.width / box.height };
}

test.describe("Footer logo proportions match navbar (mobile)", () => {
  // Run only on the mobile project — desktop has its own chrome regression.
  test.skip(({}, testInfo) => testInfo.project.name !== "mobile-chromium", "mobile-only spec");

  for (const bp of MOBILE_BREAKPOINTS) {
    test(`@ ${bp.name} (${bp.width}×${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/");
      await settle(page);

      // 1. Measure navbar logo (top of page, already in view).
      const navLogo = await measureLogo(page, "header img.logo-mark--teal-on-ivory");

      // 2. Scroll to footer and measure its logo.
      const footer = page.locator("footer").first();
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const footerLogo = await measureLogo(page, "footer img.logo-mark--gold-on-charcoal");

      // ── Assertion 1: navbar logo height matches the responsive ladder.
      // This catches accidental Tailwind class drift (e.g. someone changes
      // h-[60px] → h-[56px] in only one component).
      expect(
        Math.abs(navLogo.height - bp.expectedNavH),
        `Navbar logo at ${bp.name} should render at ~${bp.expectedNavH}px, got ${navLogo.height.toFixed(2)}px`,
      ).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);

      // ── Assertion 2: footer logo height = navbar height × gold scale.
      // This is THE proportionality check the user asked for.
      const expectedFooterH = bp.expectedNavH * EXPECTED_GOLD_SCALE;
      expect(
        Math.abs(footerLogo.height - expectedFooterH),
        `Footer logo at ${bp.name} should render at ~${expectedFooterH.toFixed(2)}px ` +
          `(${bp.expectedNavH}px × ${EXPECTED_GOLD_SCALE} scale), got ${footerLogo.height.toFixed(2)}px. ` +
          `If you intentionally changed --logo-scale-gold-on-charcoal, update EXPECTED_GOLD_SCALE in this spec.`,
      ).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);

      // ── Assertion 3: aspect ratios match (no squash in either chrome).
      // The scale transform preserves aspect, so both should be ≈ 909/579.
      const expectedAspect = 909 / 579;
      expect(
        Math.abs(navLogo.aspect - expectedAspect),
        `Navbar logo aspect ${navLogo.aspect.toFixed(4)} drifted from artwork ${expectedAspect.toFixed(4)}`,
      ).toBeLessThanOrEqual(ASPECT_TOLERANCE);
      expect(
        Math.abs(footerLogo.aspect - expectedAspect),
        `Footer logo aspect ${footerLogo.aspect.toFixed(4)} drifted from artwork ${expectedAspect.toFixed(4)}`,
      ).toBeLessThanOrEqual(ASPECT_TOLERANCE);

      // ── Assertion 4: aspects match each other within a tighter budget.
      // (Catches the case where one breakpoint somehow gets non-uniform
      // width/height styling.)
      expect(
        Math.abs(navLogo.aspect - footerLogo.aspect),
        `Navbar (${navLogo.aspect.toFixed(4)}) and footer (${footerLogo.aspect.toFixed(4)}) ` +
          `aspect ratios drifted apart at ${bp.name}`,
      ).toBeLessThanOrEqual(ASPECT_TOLERANCE);
    });
  }
});
