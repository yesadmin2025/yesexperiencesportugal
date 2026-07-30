/**
 * Signature pages — automated accessibility scan.
 *
 * For every Signature tour, this spec fails CI if:
 *   1. Any rendered <img> is missing an `alt` attribute
 *      (axe `image-alt` rule + direct DOM assertion).
 *   2. The landmark structure is broken — no single <main>,
 *      duplicate landmarks, or content outside landmarks
 *      (axe `landmark-one-main`, `landmark-no-duplicate-main`,
 *      `landmark-unique`, `region`).
 *   3. The route map is missing its accessible name
 *      (`[role="img"][aria-label^="Route map"]` must exist).
 *
 * Complements `signature-map-and-images.spec.ts` (which checks
 * that the map renders and images resolve) with an a11y contract.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signatureTours } from "../src/data/signatureTours";

const TOUR_IDS = signatureTours.map((t) => t.id);

const A11Y_RULES = [
  "image-alt",
  "role-img-alt",
  "landmark-one-main",
  "landmark-no-duplicate-main",
  "landmark-unique",
  "landmark-complementary-is-top-level",
  "region",
  "heading-order",
  "document-title",
  "html-has-lang",
];

test.describe("Signature tour pages — a11y (alt text + landmarks)", () => {
  for (const tourId of TOUR_IDS) {
    test(`/${tourId} has alt text on every image and valid landmark structure`, async ({
      page,
    }) => {
      await page.goto(`/tours/${tourId}`, { waitUntil: "domcontentloaded" });

      // Trigger lazy sections + IntersectionObserver reveals so the map,
      // gallery, and any lazy imagery mount before we scan.
      await page.evaluate(async () => {
        const step = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 600) {
          window.scrollTo(0, y);
          await step();
        }
        window.scrollTo(0, 0);
      });

      // Wait for the map so its accessible name is present in the scan.
      const map = page.locator('[role="img"][aria-label^="Route map"]').first();
      await expect(map, `map landmark missing on /tours/${tourId}`).toBeVisible({
        timeout: 25_000,
      });

      // Direct alt-text assertion — every rendered <img> must declare alt
      // (empty string is acceptable for decorative images).
      const missingAlt = await page.$$eval("img", (imgs) =>
        imgs
          .filter((el) => !el.hasAttribute("alt"))
          .map(
            (el) =>
              (el as HTMLImageElement).currentSrc ||
              (el as HTMLImageElement).src ||
              el.outerHTML.slice(0, 120),
          ),
      );
      expect(
        missingAlt,
        `images missing alt on /tours/${tourId}:\n${missingAlt.join("\n")}`,
      ).toEqual([]);

      // Exactly one <main> landmark per page.
      const mainCount = await page.locator("main").count();
      expect(mainCount, `expected exactly one <main> on /tours/${tourId}`).toBe(1);

      // Axe scan — alt text + landmark rules only, to keep this spec
      // focused and stable against unrelated a11y drift covered elsewhere.
      // Polled: the scan can otherwise race client hydration, which remounts
      // globally-rendered chrome (support FAB, currency live regions).
      await expect
        .poll(
          async () => {
            const { violations } = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .options({ runOnly: { type: "rule", values: A11Y_RULES } })
              .analyze();
            return JSON.stringify(violations, null, 2);
          },
          { message: `axe violations on /tours/${tourId}`, timeout: 20_000 },
        )
        .toBe("[]");
    });
  }
});
