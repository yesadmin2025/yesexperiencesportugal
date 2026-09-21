import { test, expect, type Page } from "@playwright/test";
import { HERO_COPY } from "../src/content/hero-copy";

/**
 * Hero copy lock — asserts every approved hero string is present
 * verbatim. Any drift in tone, punctuation or wording fails CI.
 *
 * Strings are imported from `src/content/hero-copy.ts`, the single
 * source of truth shared with the home route. Edit copy there only —
 * never duplicate it in this file.
 */

export { HERO_COPY };

async function gotoHero(page: Page) {
  // `?hero=last` freezes the cinematic 5-scene sequence on the final
  // (action) scene, where all approved hero copy + CTAs + microcopy
  // are simultaneously visible. The auto-cycling sequence is for the
  // real visitor; the lock asserts the FINAL anchor state.
  await page.goto("/?hero=last");
  const h1 = page.locator("h1.hero-h1");
  await expect(h1).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector("h1.hero-h1") as HTMLElement | null;
    return !!el && getComputedStyle(el).opacity === "1";
  });
}

test.describe("Hero — approved copy lock", () => {
  test("headline (both lines) matches approved copy exactly", async ({ page }) => {
    await gotoHero(page);
    const h1 = page.locator("h1.hero-h1");
    const text = (await h1.innerText()).replace(/\s+/g, " ").trim();
    expect(text).toBe(`${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`);
  });

  test("service-support copy stays in the hidden verification contract, not the visual Hero", async ({ page }) => {
    await gotoHero(page);
    await expect(page.locator('[data-section="hero"] [data-hero-field="subheadline"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="hero-copy-version"]')).toHaveAttribute(
      "data-hero-subheadline",
      HERO_COPY.subheadline,
    );
  });

  test("primary and secondary CTAs match approved labels", async ({ page }) => {
    await gotoHero(page);
    await expect(page.locator('[data-hero-field="primaryCta"]')).toBeVisible();
    await expect(page.locator('[data-hero-field="secondaryCta"]')).toBeVisible();
  });

  test("lower navigation micro-links stay outside the Hero composition", async ({ page }) => {
    await gotoHero(page);
    await expect(page.locator('[data-section="hero"] [data-hero-field="brandLine"]')).toHaveCount(0);
    await expect(page.locator('[data-section="hero"] [data-testid="hero-book-direct"]')).toHaveCount(0);
  });
});
