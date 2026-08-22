import { test, expect } from "@playwright/test";
import { SITEMAP_STATIC_ROUTES } from "../src/generated/sitemap-routes";

/**
 * Heading-structure guardrail (SEO + a11y).
 *
 * For every indexable route in the generated sitemap:
 *   1. exactly one visible <h1>;
 *   2. the h1 is non-empty;
 *   3. no heading level is skipped (h1 → h3 without an h2, etc.).
 *
 * Runs on the rendered DOM rather than a static source parse, so
 * conditional branches (loading / not-found) can't produce false
 * positives.
 */

const PATHS = SITEMAP_STATIC_ROUTES.map((r) => r.path);

test.describe("heading structure", () => {
  test.describe.configure({ mode: "parallel" });

  for (const path of PATHS) {
    test(`${path} — single h1 and no skipped levels`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      const headings = await page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
        );
        return nodes
          .filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return false;
            if (el.getAttribute("aria-hidden") === "true") return false;
            return true;
          })
          .map((el) => ({
            level: Number(el.tagName.slice(1)),
            text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
          }));
      });

      const h1s = headings.filter((h) => h.level === 1);
      expect(h1s.length, `${path} must have exactly one visible h1`).toBe(1);
      expect(h1s[0].text.length, `${path} h1 must not be empty`).toBeGreaterThan(0);

      const skips: string[] = [];
      let previous = 1;
      for (const h of headings) {
        if (h.level > previous + 1) {
          skips.push(`h${previous} → h${h.level} ("${h.text.slice(0, 48)}")`);
        }
        previous = h.level;
      }
      expect(skips, `${path} skips heading levels: ${skips.join("; ")}`).toEqual([]);
    });
  }
});
