/**
 * RefineAccordion — collapsible refinement section for the reveal.
 *
 * Presentational and controlled: parent decides `open`/`onOpenChange`.
 * Uses button + region pair so screen readers announce collapse/expand
 * correctly. Children remain mounted so the CSS max-height/opacity
 * transition can play both ways (hidden by aria-hidden + inert-style
 * pointer/opacity when collapsed). Respects prefers-reduced-motion.
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";
import { CTA_REFINE } from "@/content/signature-day-copy";

export interface RefineAccordionProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly count?: number; // shown as "· N moments" beside the title
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

export function RefineAccordion({
  open,
  onOpenChange,
  count,
  children,
  className,
  testId,
}: RefineAccordionProps) {
  const regionId = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = React.useState<number | undefined>(undefined);

  // Measure on open/close and on resize while open so the transition
  // interpolates against a real height instead of "auto".
  React.useEffect(() => {
    if (!contentRef.current) return;
    if (!open) {
      setMaxH(0);
      return;
    }
    const measure = () => {
      if (contentRef.current) setMaxH(contentRef.current.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [open, children]);

  return (
    <section
      data-testid={testId ?? "studio-v3-refine-accordion"}
      data-open={open ? "true" : "false"}
      className={cn("w-full py-3", className)}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={regionId}
        className="w-full min-h-[48px] flex items-center justify-between gap-3 px-1 py-2.5 rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-colors active:bg-[color:var(--sand)]/40"
      >
        <span className="flex items-center gap-3">
          <Eyebrow>{CTA_REFINE}</Eyebrow>
          {typeof count === "number" && count > 0 ? (
            <span
              className="text-[11px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              · {count} {count === 1 ? "moment" : "moments"}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none"
          style={{
            color: "var(--charcoal)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        id={regionId}
        aria-hidden={!open}
        style={{
          maxHeight: maxH,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 260ms cubic-bezier(0.22,0.61,0.36,1), opacity 200ms ease-out",
          pointerEvents: open ? "auto" : "none",
        }}
        className="motion-reduce:transition-none"
      >
        <div ref={contentRef} className="pt-3">
          {children}
        </div>
      </div>
    </section>
  );
}

export default RefineAccordion;
