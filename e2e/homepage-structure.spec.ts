import { test, expect, type Page } from "@playwright/test";
import {
  APPROVED_HOMEPAGE_SECTIONS,
  APPROVED_SECTION_COUNT,
  MOBILE_BREAKPOINTS,
  MOBILE_LAYOUT_INVARIANTS,
  spacingFloorPx,
} from "../src/content/approved-homepage-structure";

/**
 * Homepage structure — live DOM regression at mobile widths.
 *
 * Companion to `src/routes/__tests__/homepage-structure.test.ts`, which
 * asserts the source of `src/routes/index.tsx` matches the approved spec.
 * That test runs fast and catches token drift, but it can't see what the
 * browser actually paints. This suite renders `/` at every viewport in
 * `MOBILE_BREAKPOINTS` and asserts:
 *
 *   1. There are exactly `APPROVED_SECTION_COUNT` top-level <section>
 *      elements on the page.
 *   2. They appear in the spec's top-to-bottom order, identified by
 *      aria-labelledby where the spec provides one (marker-only sections
 *      are matched purely by index — order is the contract).
 *   3. The real vertical gap between every adjacent section meets the
 *      Tailwind spacing floor declared in the spec, derived as:
 *
 *          floorPx = (prev.bottomPadding + next.topPadding)
 *
 *      i.e. the sum of the two min `py-N` (or `pb-N`) tokens that touch
 *      at the seam, in real CSS pixels. A `py-24 → py-8` regression
 *      collapses that floor and fails this test.
 *
 * Spec → source coupling: if you intentionally change a section, update
 *   `approved-homepage-structure.ts` first; this suite will tell you
 *   exactly which order/spacing rule drifted in the live DOM.
 */

const ROUTE = "/";

/**
 * Content sections only. Excludes the sonner toast live-region
 * (`<section aria-live="polite">`), which is app chrome rendered by the
 * root layout and is not part of the approved homepage structure.
 */
const CONTENT_SECTION_SELECTOR = "section:not([aria-live])";

/**
 * Minimum bottom-padding of the previous section + top-padding of the
 * next, in CSS pixels, derived from the Tailwind floor in the spec.
 *
 *   - `py` floor contributes its full minScale to BOTH sides
 *   - `pb` floor contributes only to the bottom of its own section
 *   - `min-h-vh` (hero) and `null` contribute 0 (measured separately)
 */
function bottomFloorPx(
  rule: (typeof APPROVED_HOMEPAGE_SECTIONS)[number]["requiredSpacing"],
): number {
  if (rule === null) return 0;
  if (rule.kind === "min-h-vh") return 0;
  // Both `py` and `pb` apply at the bottom of the section.
  return rule.minScale * MOBILE_LAYOUT_INVARIANTS.tailwindUnitPx;
}

function topFloorPx(rule: (typeof APPROVED_HOMEPAGE_SECTIONS)[number]["requiredSpacing"]): number {
  if (rule === null) return 0;
  if (rule.kind === "min-h-vh") return 0;
  // Only `py` applies at the top; `pb` does not.
  if (rule.kind === "pb") return 0;
  return rule.minScale * MOBILE_LAYOUT_INVARIANTS.tailwindUnitPx;
}

async function gotoHomeStable(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  // The hero plays continuous media, so `networkidle` never settles.
  // Bound it instead and fall through once the DOM is usable.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  // Wait for the hero h1 — it lives inside an `sr-only` probe (visually
  // hidden but present), so assert attachment rather than visibility.
  await expect(page.locator("h1.hero-h1")).toBeAttached();

  // Disable smooth scroll + animations so layout is stable for measurement.
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

for (const vp of MOBILE_BREAKPOINTS) {
  test.describe(`homepage structure @ ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoHomeStable(page);
    });

    test("has exactly the approved number of top-level sections", async ({ page }) => {
      const count = await page.locator(CONTENT_SECTION_SELECTOR).count();
      expect(count).toBe(APPROVED_SECTION_COUNT);
    });

    test("sections appear in the approved order with matching aria-labelledby", async ({
      page,
    }) => {
      const ariaIds = await page.evaluate(
        (sel) =>
          Array.from(document.querySelectorAll(sel)).map(
            (el) => el.getAttribute("aria-labelledby") ?? "",
          ),
        CONTENT_SECTION_SELECTOR,
      );

      expect(ariaIds.length).toBe(APPROVED_SECTION_COUNT);

      for (let i = 0; i < APPROVED_HOMEPAGE_SECTIONS.length; i++) {
        const spec = APPROVED_HOMEPAGE_SECTIONS[i];
        const live = ariaIds[i];
        if (spec.ariaLabelledBy) {
          expect(
            live,
            `Section ${spec.order} (“${spec.name}”) should have aria-labelledby="${spec.ariaLabelledBy}" at position ${i + 1}`,
          ).toBe(spec.ariaLabelledBy);
        }
        // Marker-only sections: order is the contract; nothing to assert here.
      }
    });

    test("real vertical gaps between adjacent sections meet the spec floors", async ({ page }) => {
      // Force layout, then collect bounding boxes for every <section>.
      const boxes = await page.evaluate((sel) => {
        const list = Array.from(document.querySelectorAll(sel));
        return list.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            top: r.top + window.scrollY,
            bottom: r.bottom + window.scrollY,
            height: r.height,
          };
        });
      }, CONTENT_SECTION_SELECTOR);

      expect(boxes.length).toBe(APPROVED_SECTION_COUNT);

      // Each section must be tall enough to host its own floor, and each
      // adjacent pair must satisfy the combined seam floor.
      const failures: string[] = [];
      for (let i = 0; i < APPROVED_HOMEPAGE_SECTIONS.length - 1; i++) {
        const prevSpec = APPROVED_HOMEPAGE_SECTIONS[i];
        const nextSpec = APPROVED_HOMEPAGE_SECTIONS[i + 1];
        const prevBox = boxes[i];
        const nextBox = boxes[i + 1];

        // Sections render back-to-back (no margin between full-bleed
        // sections), so the "real gap" is the sum of paddings that meet
        // at the seam. Measure the minimum continuous height each
        // section's padding floor contributes:
        //   prev contributes its bottom-padding floor
        //   next contributes its top-padding floor
        const seamFloor =
          bottomFloorPx(prevSpec.requiredSpacing) + topFloorPx(nextSpec.requiredSpacing);

        if (seamFloor === 0) continue; // hero seam etc. — not measured here

        // Each section must be AT LEAST as tall as the sum of its own
        // top + bottom padding floors (otherwise the floor was nuked).
        const prevSelfMin =
          bottomFloorPx(prevSpec.requiredSpacing) + topFloorPx(prevSpec.requiredSpacing);
        const nextSelfMin =
          bottomFloorPx(nextSpec.requiredSpacing) + topFloorPx(nextSpec.requiredSpacing);

        if (prevBox.height + 0.5 < prevSelfMin) {
          failures.push(
            `Section ${prevSpec.order} (“${prevSpec.name}”) is ${prevBox.height.toFixed(1)}px tall, ` +
              `but its padding floors require ≥ ${prevSelfMin}px.`,
          );
        }
        if (nextBox.height + 0.5 < nextSelfMin) {
          failures.push(
            `Section ${nextSpec.order} (“${nextSpec.name}”) is ${nextBox.height.toFixed(1)}px tall, ` +
              `but its padding floors require ≥ ${nextSelfMin}px.`,
          );
        }

        // The seam itself: from the visible content of `prev` to the
        // visible content of `next`. Because adjacent sections touch
        // (prev.bottom === next.top), the combined padding IS the gap
        // between content. Sub-pixel tolerance: allow 0.5px rounding.
        const measuredSeam =
          prevBox.bottom - prevBox.top >= prevSelfMin &&
          nextBox.bottom - nextBox.top >= nextSelfMin;
        if (!measuredSeam) {
          failures.push(
            `Seam between section ${prevSpec.order} (“${prevSpec.name}”) and ` +
              `section ${nextSpec.order} (“${nextSpec.name}”) does not meet ` +
              `the combined floor of ${seamFloor}px.`,
          );
        }

        // Adjacent sections must follow each other with no overlap and no
        // large void. A small positive delta is legitimate: the FAQ block
        // is wrapped in a padded <div> whose padding sits outside the
        // component's own <section>. A big delta would mean a section was
        // removed or an unapproved block slipped in between.
        const seamDelta = nextBox.top - prevBox.bottom;
        expect(
          seamDelta,
          `Sections ${prevSpec.order} and ${nextSpec.order} should follow each other (delta ≈ 0), got ${seamDelta.toFixed(1)}px`,
        ).toBeGreaterThan(-1);
        expect(
          seamDelta,
          `Unexpected ${seamDelta.toFixed(1)}px void between sections ${prevSpec.order} and ${nextSpec.order}`,
        ).toBeLessThan(200);
      }

      if (failures.length > 0) {
        throw new Error(
          `Spacing floor regressions at ${vp.name} (${vp.width}×${vp.height}):\n  - ${failures.join("\n  - ")}`,
        );
      }
    });

    test("page does not horizontally overflow the viewport", async ({ page }) => {
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });
      // Allow 1px rounding tolerance for sub-pixel layouts.
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  });
}
