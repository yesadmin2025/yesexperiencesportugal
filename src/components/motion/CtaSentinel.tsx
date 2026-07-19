import { forwardRef } from "react";

/**
 * CtaSentinel — an invisible 1px marker placed in the narrative flow
 * at the point a CTA becomes the logical next step. Pair it with
 * `useCtaSentinel(sentinelRef, ctaRef)` to add `data-cta-active` to
 * the CTA when this element enters the viewport.
 *
 * Non-interactive, decorative, hidden from accessibility APIs.
 */
export const CtaSentinel = forwardRef<HTMLSpanElement>(function CtaSentinel(_props, ref) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none block h-px w-full select-none"
      style={{ visibility: "hidden" }}
      data-cta-sentinel=""
    />
  );
});
