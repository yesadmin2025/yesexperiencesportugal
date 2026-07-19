import { useEffect, type RefObject } from "react";

/**
 * useSceneReveal — progressive-enhancement scroll reveal.
 *
 * Contract:
 *  • Content is ALWAYS visible by default. Hidden reveal styles only
 *    apply to elements marked with `[data-scene-ready="1"]`.
 *  • If the target element is already inside (or near) the viewport
 *    at mount, we NEVER hide it. `data-scene="in"` is set immediately
 *    so already-visible content does not flicker.
 *  • Otherwise we mark it `data-scene-ready="1"` (opts the CSS reveal
 *    in), then flip to `data-scene="in"` on first intersection.
 *  • The IntersectionObserver disconnects the moment it fires — one
 *    reveal per element per lifetime. StrictMode double-mount is a
 *    no-op because the second pass sees `data-scene="in"` already.
 *  • Under `prefers-reduced-motion: reduce`, we skip the reveal-ready
 *    hidden state entirely — final state is painted on mount and the
 *    reduced-motion CSS block guarantees no transform/opacity delay.
 *  • Runs on every pointer type. Coarse pointer does NOT disable it.
 *
 * Never call more than once per element.
 */
export interface UseSceneRevealOptions {
  /** IntersectionObserver rootMargin. Default nudges reveal slightly early. */
  rootMargin?: string;
  /** Intersection threshold. Default 0.12. */
  threshold?: number;
  /** Disable the reveal entirely (fully static). */
  disabled?: boolean;
}

export function useSceneReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseSceneRevealOptions = {},
): void {
  const { rootMargin = "0px 0px -10% 0px", threshold = 0.12, disabled = false } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    if (el.dataset.scene === "in") return; // StrictMode double-mount guard.

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion: reveal immediately, no hidden initial state.
    if (prefersReduced) {
      el.dataset.scene = "in";
      return;
    }

    // If IntersectionObserver is missing (very old browsers / no-JS
    // fallbacks that only got hydration this far), reveal immediately.
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      el.dataset.scene = "in";
      return;
    }

    // Already visible at mount? Do not hide; paint revealed immediately.
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const alreadyVisible = rect.top < viewportH * 0.92 && rect.bottom > 0;
    if (alreadyVisible) {
      el.dataset.scene = "in";
      return;
    }

    // Below the fold: opt in to reveal styles, then observe.
    el.dataset.sceneReady = "1";

    const io = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.scene = "in";
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);

    return () => {
      io.disconnect();
    };
  }, [ref, rootMargin, threshold, disabled]);
}
