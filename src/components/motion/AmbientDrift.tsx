import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * AmbientDrift — continuous cinematic micro-motion (translate + scale)
 * on background/atmosphere imagery. Only plays while in viewport, and
 * pauses under prefers-reduced-motion (CSS handles it).
 *
 * Does not clip children — keep children with their own overflow rules.
 */
interface AmbientDriftProps {
  children: ReactNode;
  className?: string;
  intensity?: "subtle" | "medium";
}

export function AmbientDrift({
  children,
  className,
  intensity = "subtle",
}: AmbientDriftProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.05 });
  return (
    <div
      ref={ref}
      data-drift={intensity}
      className={cn("motion-drift", inView && "is-playing", className)}
    >
      {children}
    </div>
  );
}
