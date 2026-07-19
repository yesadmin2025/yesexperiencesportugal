import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * MaskReveal — diagonal clip-path wipe used on hero/editorial imagery.
 * GPU-only (clip-path + transform). SSR-safe: renders content immediately;
 * animation gated by hydration + IntersectionObserver.
 */
interface MaskRevealProps {
  children: ReactNode;
  className?: string;
  direction?: "left" | "diagonal";
  as?: "div" | "figure" | "span";
}

export function MaskReveal({
  children,
  className,
  direction = "left",
  as: Tag = "div",
}: MaskRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      data-mask-dir={direction}
      className={cn("motion-mask", inView && "is-visible", className)}
    >
      {children}
    </Tag>
  );
}
