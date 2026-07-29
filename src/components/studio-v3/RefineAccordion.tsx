/**
 * RefineAccordion — thin wrapper that collapses the refinement section by
 * default (plan §E: "Adjust the moments" accordion, auto-opens if the user
 * taps a stop chip elsewhere in the reveal).
 *
 * Presentational and controlled: parent decides `open`/`onOpenChange`.
 * Uses native <details>-like semantics via a button + region pair so
 * screen readers announce collapse/expand correctly.
 *
 * Kept independent from RefineStopCard so it can wrap any refinement UI
 * (current inline stops editor during migration, RefineStopCard list after).
 */

import * as React from "react";
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
  return (
    <section
      data-testid={testId ?? "studio-v3-refine-accordion"}
      data-open={open ? "true" : "false"}
      className={cn("w-full py-4", className)}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={regionId}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 px-1 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
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
        <span
          aria-hidden
          className="text-[16px] font-semibold transition-transform"
          style={{
            color: "var(--charcoal)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ⌄
        </span>
      </button>
      <div id={regionId} hidden={!open} className={cn(open ? "mt-3" : "")}>
        {open ? children : null}
      </div>
    </section>
  );
}

export default RefineAccordion;
