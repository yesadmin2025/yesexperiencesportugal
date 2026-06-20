import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Final CTA arrow color contract — visual regression via computed style.
 *
 * The homepage final-CTA card lives on an ivory surface (re-aligned to
 * the page's editorial system). Two buttons:
 *
 *   • Primary  ("Create Your Story")  — teal background
 *       arrow color : --gold-soft (#E1CFA6) at rest
 *       arrow color : --gold      (#C9A96A) on hover
 *
 *   • Ghost    ("Talk to a Local")    — ivory background, teal border
 *       arrow color : --gold      (#C9A96A) at rest
 *       arrow color : --gold-deep (#B89452) on hover
 *
 *   Focus    (both): retains the rest-state arrow color, gains the
 *                    --gold focus ring (asserted via box-shadow).
 *
 * Rationale for the asymmetry: arrows must read clearly against their
 * background. On teal we lift to gold-soft (more luminance); on ivory
 * we drop to gold/gold-deep (more weight). Hover always moves one step
 * along the gold ramp toward higher contrast with the bg.
 */

// Hex values straight from src/styles.css :root — must match exactly.
const ARROW_COLORS = {
  gold: "rgb(201, 169, 106)", // var(--gold)        #C9A96A
  goldSoft: "rgb(225, 207, 166)", // var(--gold-soft)   #E1CFA6
  goldDeep: "rgb(184, 148, 82)", // var(--gold-deep)   #B89452
} as const;

async function gotoFinalCta(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // Disable transitions/animations so hover color settles instantly —
  // Playwright already disables animations via expect.toHaveScreenshot
  // config but `page.hover()` -> getComputedStyle still races with
  // 300ms color transitions. Force-set transition: none everywhere.
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important; animation: none !important; }`,
  });
  // Scroll the final CTA card into view so it's fully laid out and
  // hoverable on mobile. The section is anchored as #final-cta.
  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await page.waitForTimeout(120); // settle reveal + scroll
}

/** Get the arrow <svg> nested inside a CTA link. */
function arrowOf(cta: Locator): Locator {
  return cta.locator("svg").first();
}

/** Read the resolved `color` (which SVG stroke=currentColor inherits). */
async function readColor(svg: Locator): Promise<string> {
  return svg.evaluate((el) => getComputedStyle(el).color);
}

test.describe("Final CTA arrow colors — primary vs ghost", () => {
  test("default (rest) state — primary=gold-soft (on teal), ghost=gold (on ivory)", async ({
    page,
  }) => {
    await gotoFinalCta(page);

    const primary = page.locator("#final-cta a", { hasText: "Create Your Story" });
    const ghost = page.locator("#final-cta a", { hasText: "Talk to a Local" });

    await page.mouse.move(0, 0);

    const primaryColor = await readColor(arrowOf(primary));
    const ghostColor = await readColor(arrowOf(ghost));

    expect
      .soft(primaryColor, "primary arrow rest = --gold-soft (on teal bg)")
      .toBe(ARROW_COLORS.goldSoft);
    expect.soft(ghostColor, "ghost arrow rest = --gold (on ivory bg)").toBe(ARROW_COLORS.gold);

    expect(primaryColor).not.toBe(ghostColor);
  });

  test("hover state — primary brightens to gold, ghost deepens to gold-deep", async ({ page }) => {
    await gotoFinalCta(page);

    const primary = page.locator("#final-cta a", { hasText: "Create Your Story" });
    const ghost = page.locator("#final-cta a", { hasText: "Talk to a Local" });

    // PRIMARY HOVER (teal bg → arrow lifts gold-soft → gold)
    await primary.hover();
    const primaryHover = await readColor(arrowOf(primary));
    expect.soft(primaryHover, "primary arrow hover = --gold").toBe(ARROW_COLORS.gold);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);

    // GHOST HOVER (ivory bg → arrow drops gold → gold-deep)
    await ghost.hover();
    const ghostHover = await readColor(arrowOf(ghost));
    expect.soft(ghostHover, "ghost arrow hover = --gold-deep").toBe(ARROW_COLORS.goldDeep);

    expect(primaryHover).not.toBe(ghostHover);
  });

  test("focus state — arrow color stays at rest value, focus ring is --gold", async ({ page }) => {
    await gotoFinalCta(page);

    const primary = page.locator("#final-cta a", { hasText: "Create Your Story" });
    const ghost = page.locator("#final-cta a", { hasText: "Talk to a Local" });

    await primary.focus();
    const primaryFocus = await readColor(arrowOf(primary));
    expect
      .soft(primaryFocus, "primary arrow focus retains --gold-soft")
      .toBe(ARROW_COLORS.goldSoft);

    const primaryRing = await primary.evaluate((el) => getComputedStyle(el).boxShadow);
    expect
      .soft(primaryRing, "primary focus ring contains --gold (#C9A96A)")
      .toMatch(/rgb\(\s*201\s*,\s*169\s*,\s*106\s*\)/);

    await primary.evaluate((el) => (el as HTMLElement).blur());

    await ghost.focus();
    const ghostFocus = await readColor(arrowOf(ghost));
    expect.soft(ghostFocus, "ghost arrow focus retains --gold").toBe(ARROW_COLORS.gold);

    const ghostRing = await ghost.evaluate((el) => getComputedStyle(el).boxShadow);
    expect
      .soft(ghostRing, "ghost focus ring contains --gold (#C9A96A)")
      .toMatch(/rgb\(\s*201\s*,\s*169\s*,\s*106\s*\)/);
  });

  test("approved palette boundary — arrows never resolve to white, black, or non-gold tokens", async ({
    page,
  }) => {
    await gotoFinalCta(page);

    const primary = page.locator("#final-cta a", { hasText: "Create Your Story" });
    const ghost = page.locator("#final-cta a", { hasText: "Talk to a Local" });

    // Sample all three states for both buttons; flag any that resolve
    // outside the approved gold ramp (gold | gold-soft | gold-deep).
    const samples: { label: string; color: string }[] = [];

    await page.mouse.move(0, 0);
    samples.push({ label: "primary rest", color: await readColor(arrowOf(primary)) });
    samples.push({ label: "ghost rest", color: await readColor(arrowOf(ghost)) });

    await primary.hover();
    samples.push({ label: "primary hover", color: await readColor(arrowOf(primary)) });
    await page.mouse.move(0, 0);
    await ghost.hover();
    samples.push({ label: "ghost hover", color: await readColor(arrowOf(ghost)) });
    await page.mouse.move(0, 0);

    await primary.focus();
    samples.push({ label: "primary focus", color: await readColor(arrowOf(primary)) });
    await primary.evaluate((el) => (el as HTMLElement).blur());
    await ghost.focus();
    samples.push({ label: "ghost focus", color: await readColor(arrowOf(ghost)) });

    const approved = new Set<string>(Object.values(ARROW_COLORS));
    const offenders = samples.filter((s) => !approved.has(s.color));

    expect(
      offenders,
      `Arrows must always resolve to {--gold, --gold-soft, --gold-deep}. ` +
        `Offenders: ${offenders.map((o) => `${o.label}=${o.color}`).join(", ") || "(none)"}`,
    ).toEqual([]);
  });

  /**
   * SVG stroke / currentColor contract.
   *
   * Lucide icons render their strokes as `stroke="currentColor"` on the
   * inner <path> elements. That means the visible arrow color is driven
   * by the SVG's CSS `color` cascading down into `stroke` via the
   * `currentColor` keyword.
   *
   * If a refactor ever:
   *   • swaps Lucide for an icon set that hard-codes stroke="#fff"
   *   • adds an inline `stroke="..."` override on the path
   *   • sets `color: ...` on the <svg> but the path uses `stroke: black`
   *
   * …then `getComputedStyle(svg).color` would still report the right
   * token (because `color` is set on the svg) while the rendered arrow
   * is the wrong color on screen. The previous tests would pass and the
   * regression would ship.
   *
   * This block closes that gap by reading the *resolved* stroke paint
   * on the inner <path> element and asserting it matches the parent
   * link's `color`. We also assert the path's `stroke` attribute is
   * literally the string `currentColor`, locking in the inheritance
   * contract at the markup level.
   */
  test("SVG stroke inherits via currentColor and matches link color across states", async ({
    page,
  }) => {
    await gotoFinalCta(page);

    const primary = page.locator("#final-cta a", { hasText: "Create Your Story" });
    const ghost = page.locator("#final-cta a", { hasText: "Talk to a Local" });

    /**
     * For a given CTA link, returns:
     *   - linkColor:    computed `color` on the <a> (the source of truth)
     *   - svgColor:     computed `color` on the <svg> (should inherit)
     *   - pathStrokeAttr: the literal `stroke` attribute on inner <path>
     *                   elements — must be "currentColor" for every path
     *   - pathStrokeComputed: computed `stroke` paint on each <path> —
     *                   must equal linkColor (rgb form) for every path
     */
    async function probe(cta: Locator) {
      return cta.evaluate((link) => {
        const svg = link.querySelector("svg");
        if (!svg) throw new Error("CTA is missing its <svg> arrow");
        const paths = Array.from(svg.querySelectorAll<SVGElement>("path, line, polyline"));
        if (paths.length === 0) throw new Error("Arrow <svg> has no stroked child elements");

        return {
          linkColor: getComputedStyle(link).color,
          svgColor: getComputedStyle(svg).color,
          pathStrokeAttrs: paths.map((p) => p.getAttribute("stroke")),
          pathStrokeComputed: paths.map((p) => getComputedStyle(p).stroke),
        };
      });
    }

    // ---------- REST ----------
    await page.mouse.move(0, 0);
    const primaryRest = await probe(primary);
    const ghostRest = await probe(ghost);

    // SVG inherits color from the link
    expect
      .soft(primaryRest.svgColor, "primary svg inherits link color")
      .toBe(primaryRest.linkColor);
    expect.soft(ghostRest.svgColor, "ghost svg inherits link color").toBe(ghostRest.linkColor);

    // Every stroked child uses stroke="currentColor" at the markup level
    for (const attr of primaryRest.pathStrokeAttrs) {
      expect.soft(attr, "primary arrow path stroke attr").toBe("currentColor");
    }
    for (const attr of ghostRest.pathStrokeAttrs) {
      expect.soft(attr, "ghost arrow path stroke attr").toBe("currentColor");
    }

    // Computed stroke paint matches the link's color exactly
    for (const stroke of primaryRest.pathStrokeComputed) {
      expect
        .soft(stroke, "primary rest stroke = link color (gold-soft)")
        .toBe(ARROW_COLORS.goldSoft);
    }
    for (const stroke of ghostRest.pathStrokeComputed) {
      expect.soft(stroke, "ghost rest stroke = link color (gold)").toBe(ARROW_COLORS.gold);
    }

    // ---------- HOVER ----------
    await primary.hover();
    const primaryHover = await probe(primary);
    for (const stroke of primaryHover.pathStrokeComputed) {
      expect.soft(stroke, "primary hover stroke = gold").toBe(ARROW_COLORS.gold);
    }
    expect.soft(primaryHover.svgColor).toBe(primaryHover.linkColor);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);

    await ghost.hover();
    const ghostHover = await probe(ghost);
    for (const stroke of ghostHover.pathStrokeComputed) {
      expect.soft(stroke, "ghost hover stroke = gold-deep").toBe(ARROW_COLORS.goldDeep);
    }
    expect.soft(ghostHover.svgColor).toBe(ghostHover.linkColor);

    await page.mouse.move(0, 0);

    // ---------- FOCUS ----------
    await primary.focus();
    const primaryFocus = await probe(primary);
    for (const stroke of primaryFocus.pathStrokeComputed) {
      expect.soft(stroke, "primary focus stroke = gold-soft (rest)").toBe(ARROW_COLORS.goldSoft);
    }
    await primary.evaluate((el) => (el as HTMLElement).blur());

    await ghost.focus();
    const ghostFocus = await probe(ghost);
    for (const stroke of ghostFocus.pathStrokeComputed) {
      expect.soft(stroke, "ghost focus stroke = gold (rest)").toBe(ARROW_COLORS.gold);
    }

    // Final hard assertion: at no point did any path lose the
    // currentColor inheritance contract.
    const allAttrs = [
      ...primaryRest.pathStrokeAttrs,
      ...ghostRest.pathStrokeAttrs,
      ...primaryHover.pathStrokeAttrs,
      ...ghostHover.pathStrokeAttrs,
      ...primaryFocus.pathStrokeAttrs,
      ...ghostFocus.pathStrokeAttrs,
    ];
    const broken = allAttrs.filter((a) => a !== "currentColor");
    expect(
      broken,
      `Every arrow path must use stroke="currentColor". Broken: ${broken.join(", ") || "(none)"}`,
    ).toEqual([]);
  });
});
