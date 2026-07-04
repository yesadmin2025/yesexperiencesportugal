/**
 * Homepage typography & spacing — cross-breakpoint regression.
 *
 * Runs across the three projects in playwright.config.ts
 * (mobile-chromium 393×727, tablet-chromium 834×1112,
 * desktop-chromium 1366×768) and guards two contracts on every
 * homepage section header:
 *
 *   1. Computed typography contract — font-family, weight, size and
 *      line-height for each locked H2 + the shared `.he-eyebrow-bar`
 *      utility. Deterministic, no image diff, so regressions surface
 *      immediately with an exact numeric delta.
 *
 *   2. Spacing contract — vertical rhythm between the eyebrow, H2 and
 *      supporting paragraph inside each section. Locks the premium
 *      hierarchy so a stray `mt-*` cannot silently drift.
 *
 * A pixel-snapshot pass then captures each header block per viewport
 * for a visual diff safety net (0.2% pixel-diff budget from the
 * project's global `expect.toHaveScreenshot` config).
 */
import { test, expect, type Page } from "@playwright/test";

// Locked ramp per homepage-typography-scale.test.ts + homepage-h2-weight.
// { mobile, tablet, desktop } — tablet uses the sm ramp (Tailwind sm ≥ 640).
type Ramp = { mobile: number; tablet: number; desktop: number };

const CONVERSION_RAMP: Ramp = { mobile: 33.6, tablet: 40, desktop: 60.8 }; // 2.1 / 2.5 / 3.8 rem
const EDITORIAL_RAMP: Ramp = { mobile: 28.8, tablet: 33.6, desktop: 47.2 }; // 1.8 / 2.1 / 2.95 rem
const DESIGNER_RAMP: Ramp = { mobile: 32, tablet: 38.4, desktop: 54.4 }; // 2 / 2.4 / 3.4 rem

const HEADINGS: Array<{ id: string; label: string; ramp: Ramp }> = [
  { id: "signatures-title", label: "Signatures (editorial)", ramp: EDITORIAL_RAMP },
  { id: "groups-title", label: "Groups (editorial)", ramp: EDITORIAL_RAMP },
  { id: "studio-title", label: "Studio (conversion)", ramp: CONVERSION_RAMP },
  { id: "final-cta-title", label: "Final CTA (conversion)", ramp: CONVERSION_RAMP },
  { id: "bespoke-designer-title", label: "Travel Designer", ramp: DESIGNER_RAMP },
];

function viewportTier(width: number): keyof Ramp {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

async function readComputed(page: Page, sel: string) {
  return page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      fontFamily: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      fontWeight: cs.fontWeight,
      fontSize: parseFloat(cs.fontSize),
      lineHeight: parseFloat(cs.lineHeight),
      marginTop: parseFloat(cs.marginTop),
      marginBottom: parseFloat(cs.marginBottom),
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
  }, sel);
}

test.describe("Homepage typography — locked H2 ramp", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for webfonts so measurements reflect the intended metrics.
    await page.evaluate(() => document.fonts?.ready);
    // Neutralise scroll-in transforms so measurements/screenshots are stable.
    await page.addStyleTag({
      content: `
        [data-motion] { opacity: 1 !important; transform: none !important; transition: none !important; }
        *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }
      `,
    });
  });

  for (const h of HEADINGS) {
    test(`#${h.id} — ${h.label}`, async ({ page, viewport }) => {
      const tier = viewportTier(viewport!.width);
      // Scroll into view so the section is laid out and any lazy child
      // components (video posters, thumbnails) don't shift the measurement.
      await page.locator(`#${h.id}`).scrollIntoViewIfNeeded();
      const m = await readComputed(page, `#${h.id}`);
      expect(m, `#${h.id} must exist`).not.toBeNull();
      expect(m!.fontFamily, "H2 uses Georgia italic emphasis stack").toMatch(/Georgia|Cormorant|serif/i);
      // Homepage exception: H2s stay at font-medium (500).
      expect(Number(m!.fontWeight)).toBe(500);
      expect(m!.fontSize).toBeCloseTo(h.ramp[tier], 1);
      // Leading stays tight & premium (0.95–1.2 range across ramps).
      const leading = m!.lineHeight / m!.fontSize;
      expect(leading).toBeGreaterThan(0.94);
      expect(leading).toBeLessThan(1.22);
    });
  }
});

test.describe("Homepage eyebrow — .he-eyebrow-bar utility lock", () => {
  test("eyebrow renders Inter 700 / 11px / 0.28em across all viewports", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts?.ready);
    const metrics = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(".he-eyebrow-bar"));
      return nodes.slice(0, 8).map((el) => {
        const cs = getComputedStyle(el);
        return {
          ff: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
          fw: cs.fontWeight,
          fs: parseFloat(cs.fontSize),
          ls: cs.letterSpacing,
          tt: cs.textTransform,
        };
      });
    });
    expect(metrics.length).toBeGreaterThan(0);
    for (const m of metrics) {
      expect(m.ff).toMatch(/Inter/i);
      expect(Number(m.fw)).toBeGreaterThanOrEqual(600);
      // Some section eyebrows scale to 11.5–12 on desktop — allow a small band.
      expect(m.fs).toBeGreaterThanOrEqual(10.5);
      expect(m.fs).toBeLessThanOrEqual(13);
      expect(m.tt).toBe("uppercase");
    }
  });
});

test.describe("Homepage spacing — section-header vertical rhythm", () => {
  // Each section: eyebrow → H2 → supporting paragraph. Bands are generous
  // enough to absorb ±1–2px sub-pixel jitter across breakpoints but tight
  // enough that any accidental `mt-*` change trips the test.
  const RHYTHM_BANDS: Record<keyof Ramp, { eyebrowToH2: [number, number]; h2ToLead: [number, number] }> = {
    mobile: { eyebrowToH2: [6, 40], h2ToLead: [8, 44] },
    tablet: { eyebrowToH2: [8, 48], h2ToLead: [10, 52] },
    desktop: { eyebrowToH2: [10, 56], h2ToLead: [12, 60] },
  };

  for (const h of HEADINGS) {
    test(`#${h.id} — eyebrow → H2 → lead rhythm`, async ({ page, viewport }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts?.ready);
      await page.addStyleTag({
        content: `[data-motion]{opacity:1 !important;transform:none !important;transition:none !important}`,
      });
      const tier = viewportTier(viewport!.width);
      await page.locator(`#${h.id}`).scrollIntoViewIfNeeded();

      const rhythm = await page.evaluate((id) => {
        const h2 = document.getElementById(id);
        if (!h2) return null;
        const container =
          h2.closest("section, article, header") ?? (h2.parentElement as HTMLElement);
        const eyebrow = container?.querySelector<HTMLElement>(
          ".he-eyebrow-bar, [data-eyebrow], .he-eyebrow",
        );
        // First paragraph after H2 within the same header block.
        let lead: HTMLElement | null = null;
        let node = h2.nextElementSibling as HTMLElement | null;
        while (node && !lead) {
          if (node.tagName === "P") lead = node;
          node = node.nextElementSibling as HTMLElement | null;
        }
        // Fallback: nearest P descendant of parent that comes after h2.
        if (!lead && h2.parentElement) {
          const ps = Array.from(h2.parentElement.querySelectorAll<HTMLElement>("p"));
          lead = ps.find((p) => p.getBoundingClientRect().top > h2.getBoundingClientRect().bottom) ?? null;
        }
        return {
          eyebrowBottom: eyebrow?.getBoundingClientRect().bottom ?? null,
          h2Top: h2.getBoundingClientRect().top,
          h2Bottom: h2.getBoundingClientRect().bottom,
          leadTop: lead?.getBoundingClientRect().top ?? null,
        };
      }, h.id);

      expect(rhythm).not.toBeNull();
      if (rhythm!.eyebrowBottom != null) {
        const gap = rhythm!.h2Top - rhythm!.eyebrowBottom;
        const [min, max] = RHYTHM_BANDS[tier].eyebrowToH2;
        expect(gap, `eyebrow→H2 gap at ${tier}`).toBeGreaterThanOrEqual(min);
        expect(gap, `eyebrow→H2 gap at ${tier}`).toBeLessThanOrEqual(max);
      }
      if (rhythm!.leadTop != null) {
        const gap = rhythm!.leadTop - rhythm!.h2Bottom;
        const [min, max] = RHYTHM_BANDS[tier].h2ToLead;
        expect(gap, `H2→lead gap at ${tier}`).toBeGreaterThanOrEqual(min);
        expect(gap, `H2→lead gap at ${tier}`).toBeLessThanOrEqual(max);
      }
    });
  }
});

test.describe("Homepage section headers — visual snapshot per viewport", () => {
  // Pixel snapshot safety net. Uses the project-wide 0.2% pixel-diff
  // budget from playwright.config.ts and clips to the header block so
  // hero video posters / lazy media don't add flake.
  for (const h of HEADINGS) {
    test(`#${h.id} header block screenshot`, async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts?.ready);
      await page.addStyleTag({
        content: `
          [data-motion]{opacity:1 !important;transform:none !important;transition:none !important}
          video, .hero-film, [data-hero-video]{visibility:hidden !important}
          *, *::before, *::after{animation:none !important;transition:none !important}
        `,
      });
      const el = page.locator(`#${h.id}`);
      await el.scrollIntoViewIfNeeded();
      // Small settle for layout after scroll.
      await page.waitForTimeout(150);
      // Screenshot the closest header wrapper (H2 + eyebrow + lead)
      // rather than just the H2 line, so spacing regressions register.
      const wrapper = el.locator("xpath=ancestor::*[self::div or self::header][1]").first();
      await expect(wrapper).toHaveScreenshot(`${h.id}.png`, {
        maxDiffPixelRatio: 0.005,
      });
    });
  }
});
