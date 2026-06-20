import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * BuilderStepper — Step 1–4 indicator with completed / active / upcoming states.
 *
 * - Completed steps render a check icon and are interactive (jump back to edit).
 * - The active step is highlighted in gold with the step number.
 * - Upcoming steps are dimmed and non-interactive.
 *
 * Keyboard:
 *   ArrowLeft  / ArrowUp    → focus previous interactive step
 *   ArrowRight / ArrowDown  → focus next interactive step (active step is reachable)
 *   Home                    → focus first step
 *   End                     → focus active step
 *   Enter / Space           → activate the focused step
 *
 * Accessibility: ordered list with `aria-current="step"` on the active item;
 * roving tabindex so the whole stepper is one Tab stop.
 */

export const BUILDER_STEP_LABELS = ["Mood", "Who", "Intention", "Rhythm"] as const;
type StepNum = 1 | 2 | 3 | 4;

interface Props {
  /** 1-indexed current step (1..4). */
  step: number;
  /** Highest step the user has completed (1-indexed). 0 = none. */
  furthestCompleted?: number;
  /** Optional click handler — receives 1-indexed step number. */
  onStepClick?: (step: StepNum) => void;
}

export function BuilderStepper({ step, furthestCompleted = 0, onStepClick }: Props) {
  const total = 4;
  const current = Math.max(1, Math.min(step, total)) as StepNum;

  // Roving tabindex — keeps the stepper a single Tab stop.
  const [focusIndex, setFocusIndex] = useState<number>(current - 1);
  useEffect(() => {
    setFocusIndex(current - 1);
  }, [current]);

  const itemRefs = useRef<(HTMLButtonElement | HTMLSpanElement | null)[]>([]);
  const pendingFocusRef = useRef<number | null>(null);

  // Which steps are reachable via keyboard (completed OR active).
  const isReachable = useCallback(
    (n: number) => n === current || n < current || n <= furthestCompleted,
    [current, furthestCompleted],
  );

  const focusItem = useCallback((idx: number) => {
    pendingFocusRef.current = idx;
    setFocusIndex(idx);
  }, []);

  useEffect(() => {
    if (pendingFocusRef.current === null) return;
    const idx = pendingFocusRef.current;
    pendingFocusRef.current = null;
    itemRefs.current[idx]?.focus();
  }, [focusIndex]);

  const moveFocus = useCallback(
    (from: number, dir: -1 | 1) => {
      let next = from;
      for (let i = 0; i < total; i++) {
        next = (next + dir + total) % total;
        if (isReachable(next + 1)) {
          focusItem(next);
          return;
        }
      }
    },
    [isReachable, focusItem],
  );

  const handleKeyDown = (e: React.KeyboardEvent, idx: number, n: StepNum) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(idx, -1);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(idx, 1);
        break;
      case "Home":
        e.preventDefault();
        for (let i = 0; i < total; i++)
          if (isReachable(i + 1)) {
            focusItem(i);
            break;
          }
        break;
      case "End":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Enter":
      case " ":
        if (onStepClick && isReachable(n) && n !== current) {
          e.preventDefault();
          onStepClick(n);
        }
        break;
    }
  };

  return (
    <nav aria-label="Builder steps" data-testid="builder-stepper">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {Array.from({ length: total }, (_, i) => {
          const n = (i + 1) as StepNum;
          const isActive = n === current;
          const isComplete = n < current || n <= furthestCompleted;
          const interactive = !!onStepClick && isReachable(n) && !isActive;
          const reachable = isReachable(n);
          const label = BUILDER_STEP_LABELS[i];
          const tabIndex = i === focusIndex ? 0 : -1;

          const dot = (
            <span
              className={[
                "inline-flex items-center justify-center rounded-full transition-all duration-200",
                "h-7 w-7 sm:h-8 sm:w-8 text-[11px] font-bold tabular-nums",
                isActive
                  ? "bg-[color:var(--gold)] text-[color:var(--ivory)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
                  : isComplete
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "bg-transparent text-[color:var(--charcoal)]/40 ring-1 ring-[color:var(--charcoal)]/20",
              ].join(" ")}
              aria-hidden="true"
            >
              {isComplete ? <Check size={13} strokeWidth={3} /> : n}
            </span>
          );

          const labelEl = (
            <span
              className={[
                "hidden sm:inline text-[10.5px] uppercase tracking-[0.2em] font-bold transition-colors",
                isActive
                  ? "text-[color:var(--charcoal)]"
                  : isComplete
                    ? "text-[color:var(--charcoal)]/70"
                    : "text-[color:var(--charcoal)]/35",
              ].join(" ")}
            >
              {label}
            </span>
          );

          const srLabel = `Step ${n} of ${total} — ${label}${
            isActive ? ", current step" : isComplete ? ", completed" : ", upcoming"
          }`;

          const sharedClass =
            "inline-flex items-center gap-1.5 sm:gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/55";

          return (
            <li key={n} className="flex items-center gap-1.5 sm:gap-2">
              {interactive ? (
                <button
                  type="button"
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  onClick={() => onStepClick?.(n)}
                  onKeyDown={(e) => handleKeyDown(e, i, n)}
                  onFocus={() => setFocusIndex(i)}
                  tabIndex={tabIndex}
                  aria-label={`Go back to ${srLabel}`}
                  className={sharedClass}
                >
                  {dot}
                  {labelEl}
                </button>
              ) : (
                <span
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role={isActive ? "button" : undefined}
                  tabIndex={isActive ? tabIndex : -1}
                  onKeyDown={isActive ? (e) => handleKeyDown(e, i, n) : undefined}
                  onFocus={isActive ? () => setFocusIndex(i) : undefined}
                  className={sharedClass}
                  aria-current={isActive ? "step" : undefined}
                  aria-disabled={!reachable || undefined}
                  aria-label={srLabel}
                >
                  {dot}
                  {labelEl}
                </span>
              )}
              {n < total && (
                <span
                  aria-hidden="true"
                  className={[
                    "h-[2px] w-4 sm:w-6 rounded-full transition-colors",
                    isComplete ? "bg-[color:var(--charcoal)]/45" : "bg-[color:var(--charcoal)]/15",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
      <span className="sr-only" aria-live="polite">
        Currently on step {current} of {total}: {BUILDER_STEP_LABELS[current - 1]}.
      </span>
    </nav>
  );
}
