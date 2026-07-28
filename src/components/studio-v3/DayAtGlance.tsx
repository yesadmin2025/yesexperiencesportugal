/**
 * DayAtGlance — meta-strip of hard facts about the resolved Signature Day.
 *
 * Step 6 of the post-builder plan. Content-only presentational component:
 * takes a typed props bag, renders a compact chip strip. No data fetching,
 * no side effects, no wiring into StudioV3 yet (Step 8 slots it in).
 *
 * Brand: Fraunces numerals in gold-deep, Inter labels in --charcoal.
 * Mobile-first, 393px baseline, safe on --ivory and --sand surfaces.
 * No forbidden motion (see mem://constraints/brand-guardrails).
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DayAtGlanceChip {
  readonly key: string;
  readonly label: string; // small-caps label ("Stops", "Driving")
  readonly value: string; // headline value ("5", "1h 40m", "22%")
  readonly hint?: string; // optional tiny hint below value
}

export interface DayAtGlanceProps {
  readonly chips: ReadonlyArray<DayAtGlanceChip>;
  readonly className?: string;
  /** Optional test id override — defaults to `studio-v3-day-at-glance`. */
  readonly testId?: string;
}

export function DayAtGlance({ chips, className, testId }: DayAtGlanceProps) {
  if (!chips.length) return null;
  return (
    <section
      aria-label="Day at a glance"
      data-testid={testId ?? "studio-v3-day-at-glance"}
      className={cn(
        "w-full grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4 py-4 border-y",
        className,
      )}
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)",
      }}
    >
      {chips.map((chip) => (
        <div key={chip.key} className="flex flex-col items-start">
          <span
            className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: "var(--gold-deep, var(--gold))" }}
          >
            {chip.label}
          </span>
          <span
            className="mt-1 text-[19px] leading-[1.1] font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--charcoal)",
            }}
          >
            {chip.value}
          </span>
          {chip.hint ? (
            <span
              className="mt-0.5 text-[11px] leading-[1.35]"
              style={{
                color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              }}
            >
              {chip.hint}
            </span>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export default DayAtGlance;
