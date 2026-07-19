import { useEffect, type RefObject } from "react";

/**
 * useCtaSentinel — fires once when an explicitly-placed sentinel
 * element enters the viewport, and toggles `data-cta-active` on the
 * target CTA element. Used to mark CTA emphasis at the narrative
 * moment the CTA becomes the logical next step — no viewport-percent
 * math, no continuous pulsing.
 *
 * Callers drop a small invisible `<CtaSentinel />` component into the
 * flow at that narrative point and pass both refs.
 */
export function useCtaSentinel<TSentinel extends HTMLElement, TCta extends HTMLElement>(
  sentinelRef: RefObject<TSentinel | null>,
  ctaRef: RefObject<TCta | null>,
): void {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const cta = ctaRef.current;
    if (!sentinel || !cta) return;
    if (cta.dataset.ctaActive === "1") return; // StrictMode guard.

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            cta.dataset.ctaActive = "1";
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.01 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sentinelRef, ctaRef]);
}
