import { test, expect } from "@playwright/test";

/**
 * motion-perf.spec.ts
 *
 * Regression gate for premium motion on mid-range devices.
 *
 * Emulates a mid-range Android (4× CPU throttle) at mobile viewport and
 * verifies that:
 *   1. The <EditorialMap> route-draw window does not spawn any long
 *      task > 200 ms (real-user perception of "stutter").
 *   2. Median frame time during the animation stays under ~22 ms
 *      (≈ 45 FPS floor — comfortable premium motion on a phone).
 *   3. Editorial hover-zoom on Plan destination gallery cards does
 *      not cause a layout thrash or long paint task.
 *
 * The test is deterministic: it drives a specific route that mounts
 * both an EditorialMap and .editorial-zoom figures, and it measures
 * frames via requestAnimationFrame inside the page context.
 */

const TARGET_PATH = "/plan/arrabida"; // has PlanDestinationMap + editorial-zoom gallery
const OBSERVE_MS = 3500;
const MAX_LONG_TASK_MS = 200;
const MAX_MEDIAN_FRAME_MS = 22;

test.describe("motion perf @perf", () => {
  test("route-draw + editorial hover-zoom stay premium on mid-range CPU", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    // Emulate a mid-range phone: throttle CPU 4× via CDP.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.goto(TARGET_PATH, { waitUntil: "domcontentloaded" });

    // Scroll the map into view so its IntersectionObserver triggers.
    await page.evaluate(() => {
      document
        .querySelector('[data-motion-surface="editorial-map"]')
        ?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
    });

    // Wait a beat for the route line to start drawing.
    await page.waitForTimeout(120);

    const metrics = await page.evaluate(
      async ({ windowMs }) => {
        const frames: number[] = [];
        const longTasks: number[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const PO: any = (window as any).PerformanceObserver;
        let po: PerformanceObserver | null = null;
        if (PO?.supportedEntryTypes?.includes?.("longtask")) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          po = new PO((list: any) => {
            for (const e of list.getEntries()) longTasks.push(e.duration);
          });
          po!.observe({ entryTypes: ["longtask"] });
        }

        await new Promise<void>((resolve) => {
          let last = performance.now();
          const start = last;
          const step = (now: number) => {
            frames.push(now - last);
            last = now;
            if (now - start < windowMs) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });

        po?.disconnect();
        // Drop the first two frames (scroll-settle noise).
        const clean = frames.slice(2).sort((a, b) => a - b);
        const median = clean[Math.floor(clean.length / 2)] ?? 0;
        const worstLong = longTasks.length ? Math.max(...longTasks) : 0;
        return { median, worstLong, samples: clean.length };
      },
      { windowMs: OBSERVE_MS },
    );

    // eslint-disable-next-line no-console
    console.log("[motion-perf]", metrics);

    expect(
      metrics.samples,
      "expected at least 60 rAF samples during the observation window",
    ).toBeGreaterThan(60);
    expect(
      metrics.worstLong,
      `worst long task ${metrics.worstLong}ms exceeded budget ${MAX_LONG_TASK_MS}ms during route-draw`,
    ).toBeLessThanOrEqual(MAX_LONG_TASK_MS);
    expect(
      metrics.median,
      `median frame ${metrics.median}ms exceeded budget ${MAX_MEDIAN_FRAME_MS}ms — motion feels sluggish on mid-range CPU`,
    ).toBeLessThanOrEqual(MAX_MEDIAN_FRAME_MS);

    // Editorial hover-zoom: hover a gallery figure and re-measure frames.
    const zoomFig = page.locator('[data-motion-surface="editorial-zoom"]').first();
    if (await zoomFig.count()) {
      await zoomFig.scrollIntoViewIfNeeded();
      const boundingBox = await zoomFig.boundingBox();
      if (boundingBox) {
        await page.mouse.move(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + boundingBox.height / 2,
        );
      }
      const zoomMetrics = await page.evaluate(async () => {
        const frames: number[] = [];
        await new Promise<void>((resolve) => {
          let last = performance.now();
          const start = last;
          const step = (now: number) => {
            frames.push(now - last);
            last = now;
            if (now - start < 800) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
        const sorted = frames.slice(1).sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)] ?? 0;
      });
      // eslint-disable-next-line no-console
      console.log("[motion-perf hover-zoom median]", zoomMetrics);
      expect(
        zoomMetrics,
        `hover-zoom median frame ${zoomMetrics}ms — zoom transform must stay compositor-only`,
      ).toBeLessThanOrEqual(MAX_MEDIAN_FRAME_MS);
    }

    await context.close();
  });
});
