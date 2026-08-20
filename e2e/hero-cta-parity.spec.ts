import { test, expect } from "@playwright/test";
import { gotoHero, measureCta, runParityChecks } from "./cta-parity-helpers";

/**
 * Hero CTA — parity contract (mobile).
 *
 * After every spacing tweak to surrounding hero elements (eyebrow,
 * subheadline, microcopy, brand line), the two CTA buttons themselves
 * must remain perfectly mirrored on mobile:
 *
 *   • identical rendered width
 *   • identical padding (top/right/bottom/left)
 *   • identical typography (font-size, line-height, letter-spacing,
 *     text-transform, text-align)
 *   • identical icon layout (icon present, same size, same right offset
 *     within the button, vertically centered)
 *
 * The differentiator between primary and secondary lives in *fill vs
 * border / color* — never in geometry. This spec locks that contract
 * at the project's default mobile viewport (Pixel 5).
 *
 * Every check is recorded via `runParityChecks` and surfaced in the CI
 * step summary by `e2e/reporters/cta-parity-summary.ts`, so a regression
 * shows the exact field + measured delta without digging into traces.
 */

test.describe("Hero CTA — primary vs secondary parity (mobile)", () => {
  test("both CTAs share identical width, padding, typography, and icon layout", async ({
    page,
  }, testInfo) => {
    await gotoHero(page);

    const primary = page.getByRole("link", {
      name: "Design your day",
      exact: true,
    });
    const secondary = page.getByRole("link", {
      name: "Explore Signature Experiences",
      exact: true,
    });

    await expect(primary).toBeVisible();
    await expect(secondary).toBeVisible();

    const [p, s] = await Promise.all([measureCta(primary), measureCta(secondary)]);

    const vp = page.viewportSize() ?? { width: 0, height: 0 };
    await runParityChecks(
      testInfo,
      {
        label: `mobile (${vp.width}×${vp.height})`,
        width: vp.width,
        height: vp.height,
      },
      p,
      s,
    );
  });

  test("both CTAs render an arrow icon (not a decorative replacement)", async ({ page }) => {
    await gotoHero(page);

    // Brand arrow renders <svg class="hero-cta__arrow">; lucide fallback allowed.
    // Asserting on the class keeps the contract explicit: if someone
    // swaps the secondary CTA's arrow for a sparkle/diamond/etc, this
    // fails immediately.
    for (const name of ["Design your day", "Explore Signature Experiences"]) {
      const cta = page.getByRole("link", { name, exact: true });
      const svg = cta.locator("svg").first();
      await expect(svg).toBeVisible();
      const cls = await svg.getAttribute("class");
      expect(cls ?? "", `${name} should render an ArrowRight icon (got class="${cls}")`).toMatch(
        /(lucide-arrow-right|hero-cta__arrow)/,
      );
    }
  });
});
