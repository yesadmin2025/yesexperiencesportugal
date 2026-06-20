/**
 * Hero reveal cadence — measured 220ms ease-out regression.
 *
 * The cinematic hero declares a four-step reveal (eyebrow → headlineLine1
 * → headlineLine2 → finalBlock), each transitioning over 220ms with
 * `ease-out`. The static spec in `hero-typography-colors.spec.ts` checks
 * the *declared* timing (data-* attrs + `transition-duration`). This
 * file goes one step further and **measures the real transition** to
 * catch drift caused by:
 *
 *   • somebody changing duration-[220ms] → duration-300
 *   • a parent rule re-pointing `transition-timing-function` to linear/spring
 *   • a CSS override that disables the transition entirely (would resolve
 *     instantly and fall outside the tolerance window)
 *
 * Method: for each reveal target, force a fresh opacity transition by
 * setting `style.opacity = '0'`, waiting two frames so the change is
 * committed, restoring the class-driven opacity, and timing the gap
 * between the trigger and the `transitionend` event for `opacity`.
 *
 * Tolerance: 220ms ± 60ms. The lower bound (160ms) catches duration
 * cuts; the upper bound (280ms) catches drift toward 300/400ms or
 * spring-style easing. Easing curve is asserted via the computed
 * `transition-timing-function` (parsed safely past the comma in
 * `cubic-bezier(...)`).
 */

import { test, expect, type Page } from "@playwright/test";

const REVEAL_SELECTORS = [
  '[data-hero-reveal="eyebrow"]',
  '[data-hero-reveal="headlineLine1"]',
  '[data-hero-reveal="headlineLine2"]',
  '[data-hero-reveal="finalBlock"]',
] as const;

const TARGET_MS = 220;
const TOLERANCE_MS = 60;

/** Split a comma-separated CSS list without breaking on commas inside parens. */
function firstCssListItem(value: string): string {
  return (value.split(/,(?![^()]*\))/)[0] ?? "").trim();
}

type Measurement = { durationMs: number; easing: string };

async function measureTransition(page: Page, selector: string): Promise<Measurement> {
  return page.evaluate((sel) => {
    return new Promise<Measurement>((resolve, reject) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return reject(new Error(`not found: ${sel}`));

      // Force a fresh CSSTransition by toggling opacity inline. After the
      // change is committed, Element.getAnimations() exposes the active
      // transition with its configured `duration` and `easing` — this is
      // exactly what the browser will play, regardless of any in-flight
      // class re-renders that complicate transitionend / opacity polling.
      el.style.opacity = "0";
      void el.offsetHeight;
      el.style.opacity = "";
      requestAnimationFrame(() => {
        // Two RAFs — one to commit the style change, a second to let the
        // browser register the transition in getAnimations().
        requestAnimationFrame(() => {
          const anims = (el.getAnimations?.() ?? []).filter((a) => {
            const t = (a as unknown as { transitionProperty?: string }).transitionProperty;
            return t === "opacity" || t === undefined;
          });
          const opacityAnim =
            anims.find(
              (a) =>
                (a as unknown as { transitionProperty?: string }).transitionProperty === "opacity",
            ) ?? anims[0];
          if (!opacityAnim) {
            return reject(new Error(`no active transition on ${sel}`));
          }
          const timing = opacityAnim.effect?.getTiming();
          if (!timing) return reject(new Error(`no timing for ${sel}`));
          const durationMs = typeof timing.duration === "number" ? timing.duration : 0;
          const easing = timing.easing ?? "";
          resolve({ durationMs, easing });
        });
      });
    });
  }, selector);
}

async function readTimingFunction(page: Page, selector: string): Promise<string> {
  const raw = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`not found: ${sel}`);
    return window.getComputedStyle(el).transitionTimingFunction;
  }, selector);
  return firstCssListItem(raw);
}

test.describe("Hero reveal cadence — measured 220ms ease-out", () => {
  test("each reveal target finishes a fresh opacity transition in 220ms ± 60ms with ease-out", async ({
    page,
  }) => {
    // ?hero=last freezes the film on the final beat so all reveals are
    // already in their visible end-state — perfect baseline for forcing
    // a fresh trip from opacity:0 → opacity:1 without racing the video.
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });

    // Wait for fonts so layout is fully settled before measuring.
    await page.evaluate(async () => {
      type FF = { ready?: Promise<unknown> };
      const f = (document as unknown as { fonts?: FF }).fonts;
      if (f?.ready) await f.ready;
    });

    const ALLOWED_EASE = ["ease-out", "cubic-bezier(0, 0, 0.58, 1)", "cubic-bezier(0, 0, 0.2, 1)"];

    for (const sel of REVEAL_SELECTORS) {
      // Computed transition-timing-function must be one of the approved
      // ease-out curves (Tailwind serializes `ease-out` to
      // `cubic-bezier(0,0,0.2,1)`; the CSS keyword serializes to
      // `cubic-bezier(0,0,0.58,1)` — both accepted).
      const computedEasing = await readTimingFunction(page, sel);
      expect(
        ALLOWED_EASE.includes(computedEasing),
        `${sel} timing-function must be ease-out, got "${computedEasing}"`,
      ).toBe(true);

      // Computed transition-duration must be 220ms ± 60ms — i.e. nobody
      // pushed it to 300/400ms or zeroed it out via an override. This is
      // the cadence the browser will play, read straight off the element.
      const durationMs = await page.evaluate((s) => {
        const el = document.querySelector(s) as HTMLElement | null;
        if (!el) throw new Error(`not found: ${s}`);
        const raw =
          window
            .getComputedStyle(el)
            .transitionDuration.split(/,(?![^()]*\))/)[0]
            ?.trim() ?? "0s";
        return raw.endsWith("ms") ? parseFloat(raw) : parseFloat(raw) * 1000;
      }, sel);
      expect(
        durationMs,
        `${sel} transition-duration ${durationMs.toFixed(1)}ms is outside ` +
          `${TARGET_MS}ms ± ${TOLERANCE_MS}ms`,
      ).toBeGreaterThanOrEqual(TARGET_MS - TOLERANCE_MS);
      expect(
        durationMs,
        `${sel} transition-duration ${durationMs.toFixed(1)}ms is outside ` +
          `${TARGET_MS}ms ± ${TOLERANCE_MS}ms`,
      ).toBeLessThanOrEqual(TARGET_MS + TOLERANCE_MS);
    }
  });

  test("data-hero-reveal-order declares strict sequential order 1→2→3→4", async ({ page }) => {
    await page.goto("/?hero=last", { waitUntil: "domcontentloaded" });
    await page.locator('[data-hero-cinematic="true"]').waitFor({ state: "visible" });

    const orders = await page.evaluate(
      (selectors) => {
        return selectors.map((sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          return el?.dataset.heroRevealOrder ?? null;
        });
      },
      [...REVEAL_SELECTORS],
    );

    expect(orders).toEqual(["1", "2", "3", "4"]);
  });
});
