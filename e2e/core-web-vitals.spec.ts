/**
 * Core Web Vitals smoke test — runs in CI on top routes.
 *
 * Guards against regressions in LCP and CLS on the routes that receive
 * organic search traffic. INP is user-driven and not measured here.
 *
 * Thresholds are deliberately conservative for a Vite dev-server run
 * (production builds are faster). The intent is to catch order-of-
 * magnitude regressions, not to replace field data from CrUX/GSC.
 */
import { test, expect, type Page } from "@playwright/test";

const ROUTES = [
  { name: "home", path: "/" },
  { name: "experiences", path: "/experiences" },
  { name: "tour", path: "/tours/lisbon-arrabida-sanctuary" },
  { name: "tailor", path: "/tours/lisbon-arrabida-sanctuary/tailor" },
  { name: "designer", path: "/portugal-travel-designer" },
] as const;

// Conservative dev-server budgets.
const LCP_BUDGET_MS = 3500;
const CLS_BUDGET = 0.1;

async function measure(page: Page): Promise<{ lcp: number | null; cls: number }> {
  return page.evaluate(
    () =>
      new Promise<{ lcp: number | null; cls: number }>((resolve) => {
        let lcp: number | null = null;
        let cls = 0;

        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as
              | (PerformanceEntry & { renderTime?: number; loadTime?: number })
              | undefined;
            if (last) lcp = last.renderTime ?? last.loadTime ?? last.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });

          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as Array<
              PerformanceEntry & { hadRecentInput?: boolean; value?: number }
            >) {
              if (!entry.hadRecentInput) cls += entry.value ?? 0;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          /* Safari/older Chromium fallback — leave defaults */
        }

        // Give the observers time to fire post-load.
        setTimeout(() => resolve({ lcp, cls }), 3500);
      }),
  );
}

for (const route of ROUTES) {
  test(`Core Web Vitals — ${route.name} (${route.path})`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    const { lcp, cls } = await measure(page);

    // LCP may be null on the video-hero homepage (video elements aren't
    // always reported by the LCP entry type). Skip the assertion when
    // the observer never fires, but always assert CLS.
    if (lcp !== null) {
      expect(lcp, `${route.name} LCP`).toBeLessThan(LCP_BUDGET_MS);
    }
    expect(cls, `${route.name} CLS`).toBeLessThan(CLS_BUDGET);
  });
}
