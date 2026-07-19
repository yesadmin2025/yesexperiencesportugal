import { useEffect, type RefObject } from "react";
import { readMotionMs } from "./readMotionMs";

/**
 * useWillChangePulse — briefly promote an element to its own compositor
 * layer for the duration of a one-shot reveal, then remove `will-change`
 * so large images / video don't retain a persistent layer.
 *
 * Sequence (matches the plan):
 *   1. add `will-change: transform, opacity`;
 *   2. wait one animation frame so the browser prepares the layer;
 *   3. flip `data-reveal="in"` on the following frame;
 *   4. remove `will-change` on `transitionend` (with a timeout fallback);
 *   5. remove on component cleanup.
 *
 * `active` is the trigger: when it becomes true, the sequence starts.
 * `cssVar` is the CSS custom property used for the transition duration
 * (used as the timeout fallback). Defaults to `--dur-image`.
 */
export function useWillChangePulse<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  cssVar = "--dur-image",
): void {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    if (el.dataset.reveal === "in") return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // Skip the will-change dance entirely; CSS reduced-motion block
      // will keep the element in its final visible state.
      el.dataset.reveal = "in";
      return;
    }

    let raf1 = 0;
    let raf2 = 0;
    let timeout = 0;
    let disposed = false;

    const cleanup = () => {
      el.style.willChange = "";
      el.removeEventListener("transitionend", onEnd);
      if (timeout) window.clearTimeout(timeout);
    };

    const onEnd = () => {
      if (disposed) return;
      cleanup();
    };

    el.style.willChange = "transform, opacity, clip-path";
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (disposed) return;
        el.dataset.reveal = "in";
        el.addEventListener("transitionend", onEnd, { once: true });
        const fallback = readMotionMs(cssVar, 900) + 120;
        timeout = window.setTimeout(onEnd, fallback);
      });
    });

    return () => {
      disposed = true;
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      cleanup();
    };
  }, [ref, active, cssVar]);
}
