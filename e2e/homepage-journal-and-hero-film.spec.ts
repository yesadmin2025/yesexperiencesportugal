import { test, expect } from "@playwright/test";

/**
 * Homepage regressions for two reported defects:
 *  1. the hero showed a still frame with a native play badge instead of the
 *     film — the film element must only become visible once it truly plays;
 *  2. the three Journal cards under the map repeated Signature cover photos.
 */
test.describe("homepage — hero film and journal photos", () => {
  test("the hero film only shows once it is actually playing", async ({ page }) => {
    await page.goto("/");
    const film = page.locator("[data-hero-film]");
    // The film mounts on idle; when it cannot play it is removed entirely.
    await page.waitForTimeout(9000);
    if ((await film.count()) === 0) return; // refused autoplay → poster only
    await expect(film).toHaveAttribute("data-hero-film-playing", "true", { timeout: 10_000 });
    await expect(film).toHaveCSS("opacity", "1");
  });

  test("journal photos are distinct and never reuse a signature cover", async ({ page }) => {
    await page.goto("/");
    const journal = page.locator('a[href*="/local-stories/"] img');
    await expect(journal.first()).toBeVisible();
    const journalSrcs = await journal.evaluateAll((els) =>
      els.map((el) => (el as HTMLImageElement).getAttribute("src") ?? ""),
    );
    expect(journalSrcs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(journalSrcs).size).toBe(journalSrcs.length);

    const tourSrcs = await page
      .locator('a[href*="/tours/"] img')
      .evaluateAll((els) => els.map((el) => (el as HTMLImageElement).getAttribute("src") ?? ""));
    for (const src of journalSrcs) {
      expect(tourSrcs).not.toContain(src);
    }
  });
});
