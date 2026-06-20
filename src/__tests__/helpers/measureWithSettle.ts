/**
 * measureWithSettle()
 * ─────────────────────────────────────────────────────────────────
 * Mounts a React element into a real DOM container, waits for fonts
 * + layout to settle, then runs a measurement callback against the
 * mounted root and returns its result. Always unmounts and removes
 * the container — even if the measurement throws.
 *
 * Use this in any future "live" test that needs getComputedStyle,
 * offsetWidth/Height, or getBoundingClientRect. It's the only
 * sanctioned way to read layout-dependent values in this project,
 * and the typography-regression stability guard enforces it.
 *
 * Example:
 *   import { measureWithSettle } from "@/__tests__/helpers/measureWithSettle";
 *
 *   const sizes = await measureWithSettle(
 *     <Hero />,
 *     (root) => {
 *       const h1 = root.querySelector("h1.hero-h1")!;
 *       const cs = getComputedStyle(h1);
 *       return {
 *         fontSize: cs.fontSize,
 *         lineHeight: cs.lineHeight,
 *         letterSpacing: cs.letterSpacing,
 *         fontWeight: cs.fontWeight,
 *       };
 *     },
 *     { width: 393 }, // mobile breakpoint
 *   );
 *
 * Options:
 *   - width  — viewport width in px (default 393, your mobile baseline)
 *   - height — viewport height in px (default 852)
 *   - container — pre-existing element to mount into (otherwise a
 *                 fresh <div> is appended to document.body)
 * ──────────────────────────────────────────────────────────────── */

import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

/** Wait for fonts + 2× rAF so style recalc and layout have flushed. */
export async function settleLayout(): Promise<void> {
  if (typeof document === "undefined") return;

  const fontsReady = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  if (fontsReady) await fontsReady;

  const raf = (cb: () => void) =>
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(cb)
      : (setTimeout(cb, 16) as unknown as number);

  await new Promise<void>((r) => raf(() => raf(() => r())));
}

export interface MeasureOptions {
  /** Viewport width in CSS pixels. Defaults to 393 (mobile-first). */
  width?: number;
  /** Viewport height in CSS pixels. Defaults to 852. */
  height?: number;
  /** Optional pre-existing container; otherwise a fresh div is used. */
  container?: HTMLElement;
}

/**
 * Mount → settle → measure → unmount. Returns the measurement value.
 * Throws a clear error if called outside a DOM environment.
 */
export async function measureWithSettle<T>(
  element: ReactElement,
  measure: (root: HTMLElement) => T | Promise<T>,
  opts: MeasureOptions = {},
): Promise<T> {
  if (typeof document === "undefined") {
    throw new Error(
      "measureWithSettle() requires a DOM environment. " +
        "Set `test.environment: 'jsdom'` (or 'happy-dom') in vitest.config.",
    );
  }

  const { width = 393, height = 852 } = opts;

  // Set viewport dimensions BEFORE mount so media queries resolve correctly.
  // jsdom respects window.innerWidth/innerHeight overrides for matchMedia
  // when paired with our matchMedia shim (vitest.setup.ts).
  try {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: height,
    });
    window.dispatchEvent(new Event("resize"));
  } catch {
    // best-effort; jsdom usually allows it
  }

  const ownsContainer = !opts.container;
  const container = opts.container ?? document.createElement("div");
  if (ownsContainer) document.body.appendChild(container);

  let root: Root | null = null;
  try {
    await act(async () => {
      root = createRoot(container);
      root.render(element);
    });

    await settleLayout();

    return await measure(container);
  } finally {
    if (root) {
      await act(async () => {
        (root as Root).unmount();
      });
    }
    if (ownsContainer && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
