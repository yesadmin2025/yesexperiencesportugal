import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * ImageReveal — Motion v4.
 * Diagonal clip-path wipe + scale(1.06→1) + blur(6px→0) synchronized on entry.
 * GPU-only. SSR-safe: renders content immediately, animation gated post-hydration.
 *
 * The observed element is an outer wrapper WITHOUT clip-path. Chromium
 * treats zero-area clip-path as `isIntersecting=false`, so the inner
 * element (which does carry the initial 0-area clip) must not be the
 * observation target.
 */
interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right" | "diagonal";
  as?: "div" | "figure" | "span";
}

export function ImageReveal({
  children,
  className,
  direction = "diagonal",
  as: Tag = "div",
}: ImageRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={cn("motion-image-reveal-outer", inView && "is-visible", className)}
    >
      <span data-reveal-dir={direction} className="motion-image-reveal">
        <span className="motion-image-reveal-inner">{children}</span>
      </span>
    </Tag>
  );
}
