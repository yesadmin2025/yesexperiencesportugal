import { ChevronLeft } from "lucide-react";
import { BUILDER_STEP_LABELS } from "./BuilderStepper";

/**
 * BuilderMobileStepSummary — compact "Step 2 of 4 · Who" bar shown on small
 * viewports above the main stepper. Includes a "Back to {prev}" link when a
 * previous step exists, so users can jump back without scrolling to find the
 * full stepper buttons.
 *
 * Visible on mobile only (sm:hidden).
 */
interface Props {
  step: number;
  furthestCompleted?: number;
  onJump?: (step: 1 | 2 | 3 | 4) => void;
}

export function BuilderMobileStepSummary({ step, furthestCompleted = 0, onJump }: Props) {
  const total = 4;
  const current = Math.max(1, Math.min(step, total));
  const label = BUILDER_STEP_LABELS[current - 1];
  const prev = current > 1 ? ((current - 1) as 1 | 2 | 3) : null;
  const prevLabel = prev ? BUILDER_STEP_LABELS[prev - 1] : null;
  const completedCount = Math.max(0, Math.min(current - 1, furthestCompleted));

  return (
    <div
      className="sm:hidden flex items-center justify-between gap-2 rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] px-3 py-2"
      aria-label="Builder step summary"
      role="region"
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/55 tabular-nums">
          Step {current} / {total}
        </p>
        <p className="text-[13px] font-semibold text-[color:var(--charcoal)] truncate">
          {label}
          <span className="ml-2 text-[10.5px] uppercase tracking-[0.2em] font-bold text-[color:var(--gold)]">
            {completedCount === 0 ? "in progress" : `${completedCount} done`}
          </span>
        </p>
      </div>
      {prev && onJump && (
        <button
          type="button"
          onClick={() => onJump(prev)}
          className="inline-flex items-center gap-1 min-h-9 px-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal)]/70 hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/50 rounded-[2px]"
          aria-label={`Jump back to step ${prev}, ${prevLabel}`}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          {prevLabel}
        </button>
      )}
    </div>
  );
}
