import { useRef } from "react";
import { useInView } from "@/components/motion/useInView";
import { cn } from "@/lib/utils";

interface RouteThreadProps {
  labels?: readonly string[];
  className?: string;
  compact?: boolean;
}

/** A lightweight, data-honest route motif shared by editorial surfaces. */
export function RouteThread({ labels = [], className, compact = false }: RouteThreadProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
  const stableLabels = labels.filter(Boolean).slice(0, compact ? 5 : 7);
  const pathRef = useRef(`route-thread-${stableLabels.join("-")}`);

  return (
    <div
      ref={ref}
      className={cn("route-thread", inView && "is-visible", compact && "route-thread--compact", className)}
      aria-label={stableLabels.length ? `Journey through ${stableLabels.join(", ")}` : undefined}
    >
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <path className="route-thread__ghost" d="M1 6 C18 1 28 11 45 6 S72 1 99 6" />
        <path className="route-thread__ink" d="M1 6 C18 1 28 11 45 6 S72 1 99 6" />
      </svg>
      {stableLabels.length > 0 && (
        <ol className="route-thread__stops">
          {stableLabels.map((label, index) => (
            <li key={`${pathRef.current}-${label}-${index}`}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}