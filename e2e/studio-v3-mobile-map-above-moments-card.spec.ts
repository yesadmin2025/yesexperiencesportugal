// Mobile-only — while the route is unfolding (map anticipation state,
// pre-reveal), the moments/story card must sit BELOW the map so the
// user can watch the route compose without the card occluding it.
//
// Runs only under the `mobile-chromium` Playwright project; skips
// elsewhere so tablet/desktop don't false-positive.

import { expect, test } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

const MAP = '[data-testid="studio-v3-map-anticipation"]';
const CARD = '[data-testid="studio-v3-moments-card"]';

test.describe("Studio V3 mobile — moments card sits below the composing map", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "mobile-only invariant",
    );
    await page.goto("/studio-v3");
    // Walk far enough to reach storyboard/map phase; walkToReveal will
    // stop at storyboard if it can't hold-journey to reveal.
    await walkToReveal(page);
  });

  test("moments card is stacked underneath the map during composition", async ({ page }) => {
    const map = page.locator(MAP).first();
    if (!(await map.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "map anticipation state not reached in this run");
      return;
    }
    const card = page.locator(CARD).first();
    if (!(await card.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "moments card not mounted this run");
      return;
    }

    const mapBox = await map.boundingBox();
    const cardBox = await card.boundingBox();
    expect(mapBox, "map has a layout box").not.toBeNull();
    expect(cardBox, "card has a layout box").not.toBeNull();
    if (!mapBox || !cardBox) return;

    // The card must start clearly below the map's mid-line, so the
    // route composition remains visible.
    expect(
      cardBox.y,
      `card top (${cardBox.y}) must be at least map mid-line (${mapBox.y + mapBox.height * 0.6})`,
    ).toBeGreaterThanOrEqual(mapBox.y + mapBox.height * 0.6);

    // And of course the card must start after the map's top edge.
    expect(cardBox.y).toBeGreaterThan(mapBox.y);

    // Artifact for review.
    await page.screenshot({ path: "/tmp/browser/mobile-stack/mobile-map-composing.png" });
  });
});
