import type { Page } from "@playwright/test";

/**
 * Wait until the router's scroll restoration has stopped moving the page.
 *
 * TanStack Router (`scrollRestoration: true`) applies the saved scroll
 * position once hydration completes, which can be a second or more after
 * `domcontentloaded`. Any scroll a spec performs before that moment is
 * silently reverted to 0, making post-hero assertions fail for reasons
 * that have nothing to do with the component under test.
 *
 * This helper probes with a small scroll and retries until the position
 * sticks, then returns the page to the top so the caller starts from a
 * known state (inside the hero).
 */
export async function settleScrollRestoration(page: Page, probeY = 300, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await page.evaluate((y) => window.scrollTo(0, y), probeY);
    // Restoration can land well over a second after hydration, so the
    // probe has to hold for a while before we trust it.
    let held = true;
    for (let i = 0; i < 6; i += 1) {
      await page.waitForTimeout(500);
      const y = await page.evaluate(() => window.scrollY);
      if (y < probeY - 5) {
        held = false;
        break;
      }
    }
    if (held) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

