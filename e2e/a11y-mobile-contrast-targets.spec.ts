/**
 * Phase 3 — accessibility & mobile regression contract.
 *
 * Fails CI when, on a 393px mobile viewport, any covered public route:
 *   1. has a WCAG 2.1 A/AA axe violation (contrast, names, roles, landmarks),
 *   2. renders a form control without an accessible label,
 *   3. renders a non-inline interactive control below the 44x44 tap target,
 *   4. overflows horizontally at a 320px width (proxy for 200% zoom).
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/",
  "/experiences",
  "/day-tours",
  "/contact",
  "/search",
  "/local-stories",
  "/reviews",
  "/tours/douro-valley-wine-experience",
];

const MOBILE = { width: 393, height: 900 };
const MIN_TAP = 43.5; // 44 CSS px with a sub-pixel rounding allowance

async function settle(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const step = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 700) {
      window.scrollTo(0, y);
      await step();
    }
    window.scrollTo(0, 0);
    await step();
  });
  await page.waitForTimeout(600);
}

test.describe("mobile a11y — contrast, labels, tap targets", () => {
  test.use({ viewport: MOBILE });

  for (const route of ROUTES) {
    test(`${route} passes axe (wcag2a/2aa) on mobile`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await settle(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const summary = results.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", ");
      expect(summary, `axe violations on ${route}: ${summary}`).toBe("");
    });

    test(`${route} has labelled controls and 44px tap targets`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await settle(page);

      const report = await page.evaluate((minTap) => {
        const small: string[] = [];
        const unlabeled: string[] = [];
        const nodes = document.querySelectorAll<HTMLElement>(
          'a,button,input,select,textarea,[role="button"]',
        );
        for (const el of nodes) {
          const rect = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          if (st.display === "none" || st.visibility === "hidden" || rect.width === 0) continue;

          const tag = el.tagName.toLowerCase();
          if (
            (tag === "input" &&
              !["hidden", "submit", "button"].includes((el as HTMLInputElement).type)) ||
            tag === "select" ||
            tag === "textarea"
          ) {
            const labelled =
              (el as HTMLInputElement).labels?.length ||
              el.getAttribute("aria-label") ||
              el.getAttribute("aria-labelledby") ||
              el.getAttribute("title");
            if (!labelled) unlabeled.push(el.outerHTML.slice(0, 120));
          }

          // Links inside running prose are exempt (WCAG 2.5.8 inline exception).
          const inlineLink = tag === "a" && el.closest("p,li,dd");
          if (inlineLink) continue;
          if (rect.height < minTap || rect.width < minTap) {
            small.push(
              `${Math.round(rect.width)}x${Math.round(rect.height)} ` +
                (el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || tag),
            );
          }
        }
        return { small: [...new Set(small)], unlabeled: [...new Set(unlabeled)] };
      }, MIN_TAP);

      expect(report.unlabeled, `unlabeled controls on ${route}`).toEqual([]);
      expect(report.small, `tap targets below 44px on ${route}`).toEqual([]);
    });
  }

  test("no horizontal overflow at 320px (200% zoom proxy)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await settle(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(2);
    }
  });
});
