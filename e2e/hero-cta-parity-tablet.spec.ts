import { test, expect } from "@playwright/test";
import { gotoHero, measureCta, runParityChecks } from "./cta-parity-helpers";

/**
 * Hero CTA — tablet parity contract.
 *
 * Companion to `hero-cta-parity.spec.ts` (mobile). The hero CTA layout
 * crosses Tailwind's `md:` breakpoint at 768px, where the two buttons
 * can shift from a stacked column to an inline row. That transition is
 * exactly where geometry drift tends to creep in: a forgotten
 * `md:w-auto`, asymmetric `md:px-*`, or an icon offset that only
 * manifests once the button is no longer full-width.
 *
 * This spec re-runs the same parity contract — width, padding,
 * typography, icon layout — at two tablet viewports:
 *
 *   • 768×1024 (iPad portrait, exact `md:` boundary)
 *   • 1024×768 (iPad landscape, just below `lg:`)
 *
 * Each run attaches a structured report consumed by the CI summary
 * reporter, so the GitHub Actions step summary shows pass/fail +
 * measured deltas per viewport.
 */

const TABLET_VIEWPORTS = [
  { label: "iPad portrait (md: boundary)", width: 768, height: 1024 },
  { label: "iPad landscape (just below lg:)", width: 1024, height: 768 },
] as const;

test.describe("Hero CTA — tablet parity (md: breakpoint and above)", () => {
  for (const vp of TABLET_VIEWPORTS) {
    test.describe(`${vp.label} — ${vp.width}×${vp.height}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("primary and secondary share width, padding, typography, icon layout", async ({
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

        await runParityChecks(
          testInfo,
          { label: vp.label, width: vp.width, height: vp.height },
          p,
          s,
        );
      });

      test("both CTAs render an arrow icon (no decorative replacement)", async ({ page }) => {
        await gotoHero(page);

        for (const name of ["Design your day", "Explore Signature Experiences"]) {
          const cta = page.getByRole("link", { name, exact: true });
          const svg = cta.locator("svg").first();
          await expect(svg).toBeVisible();
          const cls = await svg.getAttribute("class");
          expect(
            cls ?? "",
            `${name} should render an ArrowRight icon (got class="${cls}")`,
          ).toMatch(/(lucide-arrow-right|hero-cta__arrow)/);
        }
      });
    });
  }
});
