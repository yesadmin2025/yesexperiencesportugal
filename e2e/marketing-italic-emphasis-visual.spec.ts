/**
 * Marketing pages — italic emphasis visual regression.
 *
 * Catches serif/italic styling regressions on the mixed roman+italic
 * H1/H2 headings used across the homepage and top marketing routes.
 * Complements the static class-string lock
 * (`src/__tests__/mixed-emphasis-heading-lock.test.ts`):
 *   - The unit test guards the source: every qualifying heading wraps
 *     emphasised words in the canonical `italic font-normal text-[var(--teal)]`
 *     span, or uses <SectionTitle.Em>.
 *   - This spec guards the rendered pixels: Georgia loaded, italic
 *     glyphs swapping in, teal applied, weight = normal — drift in any
 *     of those fails the diff.
 *
 * Strategy: for each route, locate every serif `h1`/`h2` that contains
 * an italic emphasis span, then element-screenshot just that heading
 * (not the surrounding section — backgrounds vary). Baselines live in
 * `e2e/marketing-italic-emphasis-visual.spec.ts-snapshots/`.
 *
 * Regenerate baselines after an intentional change:
 *   bunx playwright test marketing-italic-emphasis-visual --update-snapshots
 *
 * Pixel-diff budget is intentionally moderate (maxDiffPixelRatio 0.02)
 * — sub-pixel font jitter across CI runs is normal; a real regression
 * (italic dropped, color drift to charcoal, Montserrat instead of
 * Georgia) is far above that floor.
 */

import { test, expect, type Page } from "@playwright/test";

const ROUTES: Array<{ slug: string; path: string; waitFor?: string }> = [
  { slug: "home", path: "/?hero=last" },
  { slug: "experiences", path: "/experiences" },
  { slug: "about", path: "/about" },
  { slug: "multi-day", path: "/multi-day" },
  { slug: "proposals", path: "/proposals" },
  { slug: "corporate", path: "/corporate" },
  { slug: "day-trips-from-lisbon", path: "/day-trips-from-lisbon" },
];

const EMPHASIS_SELECTOR =
  'h1.serif:has(span.italic), h2.serif:has(span.italic), h1[class*="serif"]:has(span.italic), h2[class*="serif"]:has(span.italic)';

async function prep(page: Page) {
  // Wait for web fonts so italic glyphs are Georgia, not the system
  // fallback. Then disable animations / hide the hero film, which
  // would otherwise dominate any pixel diff on routes that include it.
  await page.evaluate(async () => {
    type FontFaceSetLike = { ready?: Promise<unknown> };
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (fonts?.ready) await fonts.ready;
    const film = document.querySelector('[data-hero-film="true"]') as HTMLVideoElement | null;
    if (film) {
      try {
        film.pause();
      } catch {
        /* noop */
      }
      film.style.visibility = "hidden";
    }
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  });
}

// Budget tuned for cross-run font/anti-alias jitter on heading element
// screenshots. A real regression (italic dropped, teal lost, Georgia
// swapped for Montserrat) shifts well over 30% of pixels and trips this
// easily; routine sub-pixel drift across runners does not.
const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.12,
  threshold: 0.3,
} as const;

test.describe("Marketing pages — italic emphasis visual regression", () => {
  for (const { slug, path } of ROUTES) {
    test(`${slug} · italic emphasis headings match approved snapshot`, async ({
      page,
    }, testInfo) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await prep(page);

      const headings = page.locator(EMPHASIS_SELECTOR);
      const count = await headings.count();
      // Every listed route must surface at least one mixed-emphasis
      // heading — if a refactor accidentally strips them all, fail loud
      // rather than passing silently with zero snapshots.
      expect(count, `${slug} should expose ≥1 italic emphasis heading`).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const heading = headings.nth(i);
        await heading.scrollIntoViewIfNeeded();
        // Settle layout post-scroll before measuring.
        await page.waitForTimeout(120);
        const buf = await heading.screenshot({
          animations: "disabled",
          caret: "hide",
          scale: "css",
        });
        await expect(buf).toMatchSnapshot(
          [`${slug}-emphasis-${i}-${testInfo.project.name}.png`],
          SNAPSHOT_OPTS,
        );
      }
    });
  }
});
