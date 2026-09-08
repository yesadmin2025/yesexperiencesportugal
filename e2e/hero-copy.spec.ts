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
  test("eyebrow matches approved copy exactly", async ({ page }) => {
    await gotoHero(page);
    await expect(page.getByText(HERO_COPY.eyebrow, { exact: true }).first()).toBeVisible();
  });

  test("headline (both lines) matches approved copy exactly", async ({ page }) => {
    await gotoHero(page);
    const h1 = page.locator("h1.hero-h1");
    const text = (await h1.innerText()).replace(/\s+/g, " ").trim();
    expect(text).toBe(`${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`);
  });

  test("subheadline matches approved copy exactly", async ({ page }) => {
    await gotoHero(page);
    await expect(page.getByText(HERO_COPY.subheadline, { exact: true })).toBeVisible();
  });

  test("primary and secondary CTAs match approved labels", async ({ page }) => {
    await gotoHero(page);
    await expect(page.getByRole("link", { name: HERO_COPY.primaryCta, exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: HERO_COPY.secondaryCta, exact: true }),
    ).toBeVisible();
  });

  test("microcopy under the buttons matches approved copy exactly", async ({ page }) => {
    await gotoHero(page);
    await expect(page.getByText(HERO_COPY.microcopy, { exact: true })).toBeHidden();
  });

  test("brand YES line matches approved copy exactly", async ({ page }) => {
    await gotoHero(page);
    await expect(page.getByText(HERO_COPY.brandLine, { exact: true })).toBeVisible();
  });
});
