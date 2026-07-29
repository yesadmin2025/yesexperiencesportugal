import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { useWillChangePulse } from "@/lib/motion/useWillChangePulse";
import { cn } from "@/lib/utils";

/**
 * RevealImage — opt-in image reveal wrapper.
 *
 * Contract:
 *  • Motion defaults to `"none"`. Callers MUST explicitly declare
 *    `motion="mask"` or `motion="scale"` at each approved call site.
 *    LCP hero images, logos, maps, payment content and functional
 *    imagery therefore stay static unless deliberately opted in.
 *  • Preserves the underlying `<img>` completely: `alt`, `srcSet`,
 *    `sizes`, `loading`, `fetchPriority`, aspect ratio, focal, etc.
 *  • `will-change` is applied only during the reveal window via
 *    `useWillChangePulse`, then removed. Never persistent.
 *  • Under `prefers-reduced-motion: reduce`, CSS forces the final
 *    visible state; JS also short-circuits the pulse.
 *  • JS-off / hydration-failed: renders fully visible (no
 *    `data-reveal-ready` attribute, so no hidden CSS applies).
 */
type RevealMotion = "none" | "mask" | "scale";

interface RevealImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  motion?: RevealMotion;
  /** Wrapper class (frame). Image-level class stays via `className`. */
  frameClassName?: string;
  /** Aspect ratio for the frame, e.g. "3/2", "16/9". Optional. */
  ratio?: string;
}

export function RevealImage({
  motion = "none",
  frameClassName,
  ratio,
  className,
  style,
  alt,
  ...imgProps
}: RevealImageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Progressive enhancement: only mark reveal-ready after mount so
  // pre-hydration paint shows the image in its natural visible state.
  useEffect(() => {
    setMounted(true);
  }, []);

  const active = motion !== "none" && mounted;
  useWillChangePulse(frameRef, active);

  const frameStyle = ratio ? { aspectRatio: ratio, ...style } : style;

  return (
    <div
      ref={frameRef}
      className={cn("relative overflow-hidden", frameClassName)}
      style={frameStyle}
      data-reveal-image=""
      data-motion={motion}
      data-reveal-ready={active ? "1" : undefined}
    >
      <img alt={alt} className={cn("block h-full w-full object-cover", className)} {...imgProps} />
    </div>
  );
}
