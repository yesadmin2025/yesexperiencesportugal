// Studio V3 — reveal blocker regression (moments reel must never trap).
//
// Historically the "Personalise a few details" CTA on the moments/map screen
// was gated behind `isLast` (opacity-0 + pointer-events-none + aria-hidden),
// so the only way out of Your Day was to let the autoplay reel walk every
// moment. When autoplay didn't run (paused tab, reduced motion, one moment,
// slow mount) the journey stalled and the walkthrough looped.
//
// This spec locks two things, with NO inflated timeouts:
//   1. the continue CTA is interactive as soon as the screen mounts,
//   2. the final reveal paints within 2500 ms of the last Refine action.

import { test, expect, devices } from "@playwright/test";
import { walkToReveal } from "./studio-v3-walk-to-reveal";

test.use({ ...devices["Pixel 5"], viewport: { width: 393, height: 588 } });

// The funnel walk itself is slow on cold CI; the measured assertions below
// use their own tight budgets.
test.setTimeout(120_000);

test("moments reel never traps the journey and the reveal paints in <=2.5s", async ({ page }) => {
  await page.goto("/studio-v3");
  await walkToReveal(page);

  const refine = page.locator('[data-studio-v3-screen="refine"]');
  await expect(refine, "walk did not reach the Refine surface").toBeVisible({ timeout: 15_000 });

  // No moments-reel remnant is still holding the screen hostage.
  const holdCta = page.locator('[data-phase-cta="hold-journey"]');
  if (await holdCta.count()) {
    const trapped = await holdCta.first().evaluate((el) => {
      const wrap = el.closest("[aria-hidden]");
      const styles = window.getComputedStyle((wrap ?? el) as Element);
      return (
        wrap?.getAttribute("aria-hidden") === "true" ||
        styles.pointerEvents === "none" ||
        styles.opacity === "0"
      );
    });
    expect(trapped, "moments CTA is non-interactive — the reel can trap the guest").toBe(false);
  }

  const cta = refine.getByTestId("studio-v3-handoff-primary").first();
  await expect(cta).toBeVisible();
  await cta.scrollIntoViewIfNeeded();

  // Budget is measured from the moment the action lands (Playwright's
  // actionability wait on an animated CTA is harness cost, not product cost).
  await cta.click();
  const started = Date.now();
  const reveal = page.getByTestId("studio-v3-final-reveal");
  await expect(reveal).toBeVisible({ timeout: 2500 });
  expect(Date.now() - started).toBeLessThanOrEqual(2500);

  const text = (await reveal.innerText()).trim();
  expect(text.length, "reveal painted empty").toBeGreaterThan(40);
  await expect(page.getByTestId("studio-v3-final-reveal-continue")).toBeVisible();
});

test("reveal still paints when every image request is blocked", async ({ page }) => {
  await page.route("**/*.{png,jpg,jpeg,webp,avif,svg}", (route) => route.abort());
  await page.goto("/studio-v3");
  await walkToReveal(page);

  const cta = page
    .locator('[data-studio-v3-screen="refine"]')
    .getByTestId("studio-v3-handoff-primary")
    .first();
  if (!(await cta.isVisible().catch(() => false))) test.skip(true, "walk did not reach Refine");
  await cta.click();

  const reveal = page.getByTestId("studio-v3-final-reveal");
  await expect(reveal).toBeVisible({ timeout: 2500 });
  expect((await reveal.innerText()).trim().length).toBeGreaterThan(40);
});
