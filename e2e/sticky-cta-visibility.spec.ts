import { test, expect, type Page, type Locator } from "@playwright/test";
import { acceptCookiesBeforeLoad } from "./consent-helpers";
import { settleScrollRestoration } from "./scroll-helpers";

/**
 * E2E coverage for the post-hero sticky CTA visibility contract.
 *
 * Contract (see src/hooks/use-past-hero.ts):
 *   1. The bar MUST NOT appear while the user is inside the hero, ever.
 *   2. The bar MUST NOT appear while the user is actively scrolling.
 *   3. The bar appears only after scrolling has been idle for ~220ms
 *      AND scrollY currently exceeds the threshold (600px).
 *   4. Scrolling back into the hero hides the bar immediately and keeps
 *      it hidden — no idle-timer reveal while inside the hero.
 *   5. A fresh load (initial paint or BFCache restore) at the top of the
 *      page must NOT flash the bar, even if the user previously scrolled
 *      past the hero in this session.
 */

// Matches the constants in src/hooks/use-past-hero.ts. Kept in sync by
// the test author; if the hook changes, update both.
const HERO_THRESHOLD = 600;
const SCROLL_IDLE_MS = 220;
// Generous safety margin on top of the idle window — flake-resistant
// without making the suite slow.
const IDLE_SETTLE_MS = SCROLL_IDLE_MS + 180;

/** Locator for the mobile sticky CTA wrapper that owns aria-hidden. */
function stickyBar(page: Page): Locator {
  // The inner Link has a stable aria-label; we go up to the wrapper
  // div that owns the visibility transform + aria-hidden.
  // While gated out the bar carries aria-hidden + inert, so the button is
  // absent from the accessibility tree — role queries cannot find it. Use
  // the stable data attributes, which work in both states.
  return page
    .locator('button[data-cta="say_yes_open"][data-cta-surface="mobile_sticky"]')
    .locator("xpath=ancestor::div[contains(@class,'fixed')][1]");
}

/** Returns true when the bar is fully visible to users + AT. */
async function expectBarHidden(page: Page) {
  const bar = stickyBar(page);
  await expect(bar).toHaveAttribute("aria-hidden", "true");
  // Defense-in-depth — opacity 0 means it's also visually invisible
  // even if a transition is in flight.
  const opacity = await bar.evaluate((el) => getComputedStyle(el).opacity);
  expect(parseFloat(opacity)).toBeLessThanOrEqual(0.05);
}

async function expectBarVisible(page: Page) {
  const bar = stickyBar(page);
  await expect(bar).toHaveAttribute("aria-hidden", "false");
  await expect(bar).toBeVisible();
  const opacity = await bar.evaluate((el) => getComputedStyle(el).opacity);
  expect(parseFloat(opacity)).toBeGreaterThan(0.95);
}

/**
 * Scroll smoothly so we stay "in motion" for `durationMs`. Each step
 * dispatches a real scroll event, mirroring user behaviour. Crucially,
 * we do NOT wait for idle between steps — the scroll handler should
 * keep the bar hidden the whole time.
 */
async function scrollOverTime(page: Page, targetY: number, durationMs: number) {
  await page.evaluate(
    async ({ targetY, durationMs }) => {
      const startY = window.scrollY;
      const delta = targetY - startY;
      const start = performance.now();
      return new Promise<void>((resolve) => {
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          window.scrollTo(0, startY + delta * t);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { targetY, durationMs },
  );
}

test.describe("Sticky CTA — post-hero visibility contract", () => {
  // The bar is `lg:hidden` — a mobile/tablet affordance only.
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= 1024,
    "Sticky CTA is intentionally hidden from the lg breakpoint up.",
  );

  test.beforeEach(async ({ page }) => {
    await acceptCookiesBeforeLoad(page);
    await page.goto("/");
    // Wait until the bar is at least mounted so locator queries don't
    // race the hero animation cascade.
    await stickyBar(page).waitFor({ state: "attached" });
    // Router scroll restoration lands after hydration and would revert any
    // scroll we perform before it — wait it out, then start from the top.
    await settleScrollRestoration(page);
  });

  test("hidden on initial load while inside the hero", async ({ page }) => {
    // Page just loaded at scrollY = 0 → fully inside the hero.
    await expectBarHidden(page);
    // Even after the idle window passes, no reveal — there's nothing
    // to reveal because we're still in the hero.
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarHidden(page);
  });

  test("stays hidden during rapid continuous scrolling past the hero", async ({ page }) => {
    // Long scroll well past the threshold over 1.2s of continuous motion.
    // The scroll handler should keep the bar hidden the entire time and
    // never schedule a reveal mid-scroll.
    const scrollPromise = scrollOverTime(page, HERO_THRESHOLD + 800, 1200);

    // Sample three times mid-scroll. Bar must be hidden at every sample.
    await page.waitForTimeout(300);
    await expectBarHidden(page);
    await page.waitForTimeout(300);
    await expectBarHidden(page);
    await page.waitForTimeout(300);
    await expectBarHidden(page);

    await scrollPromise;
  });

  test("reveals only after scrolling stops past the hero (idle gate)", async ({ page }) => {
    await scrollOverTime(page, HERO_THRESHOLD + 400, 600);

    // Immediately after scroll ends — still hidden, idle timer has not
    // elapsed yet.
    await expectBarHidden(page);

    // After the idle window settles → bar should appear.
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarVisible(page);
  });

  test("hides immediately when scrolling back up into the hero and stays hidden on stop", async ({
    page,
  }) => {
    // 1. Get the bar visible past the hero.
    await scrollOverTime(page, HERO_THRESHOLD + 400, 600);
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarVisible(page);

    // 2. Scroll back up into the hero. Mid-scroll the bar must hide.
    const upScroll = scrollOverTime(page, 0, 700);
    await page.waitForTimeout(120);
    await expectBarHidden(page);
    await upScroll;

    // 3. Stop inside the hero. The contract is: no reveal here, even
    //    after the idle window. The hook's onScroll explicitly skips
    //    scheduling settle() when scrollY <= threshold.
    await page.waitForTimeout(IDLE_SETTLE_MS * 2);
    await expectBarHidden(page);
  });

  test("snap-scroll past hero stays hidden until idle, then appears", async ({ page }) => {
    // Simulate a fast snap (e.g. a jump-to-section anchor or wheel snap):
    // a single scrollTo lands us well past the hero without the smooth
    // ramp. The scroll event still fires, so the bar must hide first
    // and only reveal after the idle window.
    await page.evaluate((y) => window.scrollTo(0, y), HERO_THRESHOLD + 500);

    // Right after the snap — still hidden (idle timer pending).
    await expectBarHidden(page);

    // After idle — visible.
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarVisible(page);

    // A second snap further down also re-hides briefly, then reveals.
    await page.evaluate((y) => window.scrollTo(0, y), HERO_THRESHOLD + 1500);
    await expectBarHidden(page);
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarVisible(page);
  });

  test("back/forward navigation does not flash the bar over the hero", async ({ page }) => {
    // 1. Trigger a "passed hero" session by scrolling + settling.
    await scrollOverTime(page, HERO_THRESHOLD + 400, 600);
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarVisible(page);

    // 2. Navigate away to another route within the same site. The
    //    sessionStorage flag persists across this navigation.
    await page.goto("/about");
    await stickyBar(page).waitFor({ state: "attached" });
    // Router scroll restoration lands after hydration and would revert any
    // scroll we perform before it — wait it out, then start from the top.
    await settleScrollRestoration(page);

    // 3. Navigate back. The browser may serve from BFCache or do a
    //    fresh render — either way, the page lands at scrollY = 0
    //    inside the hero and the bar must NOT flash.
    await page.goBack();
    await stickyBar(page).waitFor({ state: "attached" });
    // Router scroll restoration lands after hydration and would revert any
    // scroll we perform before it — wait it out, then start from the top.
    await settleScrollRestoration(page);

    // First frame after restore: hidden. Even though sessionStorage
    // says we passed the hero earlier, the current scrollY is in the
    // hero, so the contract requires hidden.
    await expectBarHidden(page);

    // And it stays hidden through the idle window — no late flash.
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarHidden(page);

    // 4. Scrolling past + idle still works on this restored page.
    await scrollOverTime(page, HERO_THRESHOLD + 400, 600);
    await page.waitForTimeout(IDLE_SETTLE_MS);
    await expectBarVisible(page);
  });
});
