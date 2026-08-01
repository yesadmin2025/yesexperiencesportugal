import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver hook. SSR-safe, one-shot by default.
 * Returns [ref, isVisible]. No layout shift, no flicker — starts hidden
 * only after hydration; server render stays neutral.
 *
 * Batch 4 safety net: if the observer never fires (broken IO, offscreen
 * measurement quirks, throttled background tab that never scrolls), a
 * failsafe timer reveals the content anyway. Reveal states must never be
 * able to strand content in its hidden pre-animation state.
 */
const FAILSAFE_MS = 1600;

export function useInView<T extends Element = HTMLElement>(
  options: { rootMargin?: string; threshold?: number; once?: boolean } = {},
) {
  const { rootMargin = "0px 0px -15% 0px", threshold = 0.15, once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);

    // Failsafe: only for elements that are already within the viewport box
    // when the timer fires, so offscreen content still animates on scroll.
    const failsafe = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh && rect.bottom > 0) {
        setInView(true);
        if (once) io.disconnect();
      }
    }, FAILSAFE_MS);

    return () => {
      clearTimeout(failsafe);
      io.disconnect();
    };
  }, [rootMargin, threshold, once]);

  return [ref, inView] as const;
}
