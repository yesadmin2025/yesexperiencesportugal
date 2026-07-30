import { test, expect, type Page } from "@playwright/test";

/**
 * Hero — visual regression suite (cinematic hero, v3).
 *
 * The chaptered hero (eyebrow + two-line headline + subheadline stacked
 * over a still) is retired. The current hero is a held film clip with a
 * centered two-line italic stanza and a delayed CTA pair; the legacy
 * copy fields survive only as sr-only SSR probes and are covered by the
 * copy-lock specs, not by pixels.
 *
 * This suite pins the two regions that are actually rendered:
 *   1. Stanza  (h1 + supporting line — italic rhythm and alignment)
 *   2. CTA pair (button widths, spacing, vertical alignment)
 *
 * Stability levers applied before every capture:
 *   • `?hero=last` freezes every reveal at its end state.
 *   • Animations/transitions killed via injected CSS.
 *   • The film stage is hidden — its frames are non-deterministic and
 *     would dominate any pixel diff.
 *
 * Update deliberately after an INTENTIONAL hero change:
 *   bunx playwright test hero-visual-regression --update-snapshots
 */

const SNAPSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.015,
  threshold: 0.2,
} as const;

async function prepareHero(page: Page) {
  await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });

  await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });
  // The semantic <h1> now lives in an sr-only probe; the visible stanza
  // renders as <p> lines inside [data-hero-stanza].
  await page.locator('[data-hero-stanza="true"] p').first().waitFor({ state: "visible" });

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      [data-hero-stanza="true"] h1,
      [data-hero-stanza="true"] p {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
      [data-hero-composed] {
        opacity: 1 !important;
        transform: none !important;
      }
      /* Non-deterministic film frames + gradients must never enter a diff. */
      .hero-story-stage { visibility: hidden !important; }
      [data-hero-copy-reset] { display: none !important; }
    `,
  });

  await page.evaluate(async () => {
    type FontFaceSetLike = { ready?: Promise<unknown> };
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (fonts?.ready) await fonts.ready;
    const video = document.querySelector('[data-hero-film="true"]') as HTMLVideoElement | null;
    if (video) {
      try {
        video.pause();
      } catch {
        /* noop */
      }
    }
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}

test.describe("Hero — visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await prepareHero(page);
  });

  test("stanza stays pixel-consistent", async ({ page }, testInfo) => {
    const stanza = page.locator('[data-hero-stanza="true"]').first();
    await expect(stanza).toBeVisible();

    // Layout contract: the two stanza lines share the same centre axis.
    const centres = await stanza.evaluate((el) => {
      const nodes = Array.from(el.querySelectorAll<HTMLElement>("h1, p"));
      return nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return Math.round(r.left + r.width / 2);
      });
    });
    expect(centres.length).toBe(2);
    expect(Math.abs(centres[0] - centres[1])).toBeLessThanOrEqual(2);

    await expect(stanza).toHaveScreenshot(
      `hero-stanza-${testInfo.project.name}.png`,
      SNAPSHOT_OPTIONS,
    );
  });

  test("CTA group spacing stays pixel-consistent", async ({ page }, testInfo) => {
    const ctaGroup = page.locator(".hero-cta-group").first();
    await expect(ctaGroup).toBeVisible();

    const layout = await ctaGroup.evaluate((group) => {
      const links = Array.from(group.querySelectorAll<HTMLElement>("a"));
      const rects = links.map((a) => a.getBoundingClientRect());
      return {
        viewportWidth: window.innerWidth,
        widths: rects.map((r) => Math.round(r.width)),
        tops: rects.map((r) => Math.round(r.top)),
      };
    });

    expect(layout.widths.length).toBe(2);
    if (layout.viewportWidth < 640) {
      // Stacked: same width, different rows.
      expect(Math.abs(layout.widths[0] - layout.widths[1])).toBeLessThanOrEqual(2);
      expect(layout.tops[1]).toBeGreaterThan(layout.tops[0]);
    } else {
      // Side by side: same baseline row.
      expect(Math.abs(layout.tops[0] - layout.tops[1])).toBeLessThanOrEqual(2);
    }

    await expect(ctaGroup).toHaveScreenshot(
      `hero-cta-group-${testInfo.project.name}.png`,
      SNAPSHOT_OPTIONS,
    );
  });
});
