import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * GoldRule — thin gold filet that draws in from the left on entry.
 * Zero layout impact; sized by parent width or explicit width class.
 */
interface GoldRuleProps {
  className?: string;
  width?: string; // tailwind width class, e.g. "w-16"
}

export function GoldRule({ className, width = "w-16" }: GoldRuleProps) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        "motion-goldrule block h-px bg-[color:var(--gold)]",
        width,
        inView && "is-visible",
        className,
      )}
    />
  );
}
