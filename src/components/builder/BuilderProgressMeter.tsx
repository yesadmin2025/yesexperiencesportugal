import { Check, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  /** Current step (1..4). */
  step: number;
  /** Number of selected interests on the intentions step. */
  selectedCount: number;
  /** Hint text shown below the bar; also announced when it changes. */
  hint: string;
}

/**
 * BuilderProgressMeter — accessible progress bar for the builder.
 *
 * Accessibility:
 * - The bar itself is a `progressbar` (role=progressbar) with `aria-valuenow`.
 *   Native progressbars are not announced live by all screen readers, so we
 *   pair it with a SEPARATE polite live region that only updates when the
 *   integer percent CHANGES — preventing chatty re-announcements.
 * - The hint text is announced via the same live region (combined message)
 *   so screen readers hear "45 percent — add another thread" as one update.
 *
 * 100% celebration: when pct reaches 100 we render a subtle checkmark badge
 * with a gentle scale-in + sparkle ring, and announce "Step complete".
 * Animations are disabled under prefers-reduced-motion via the .builder-reveal
 * conventions already in styles.css; the keyframes used here are inline-safe
 * and short (≤220ms).
 */
export function BuilderProgressMeter({ step, selectedCount, hint }: Props) {
  const totalSteps = 4;
  const stepShare = 100 / totalSteps;
  const within =
    selectedCount === 0 ? 0 : selectedCount === 1 ? 0.55 : selectedCount === 2 ? 0.8 : 1;
  const pct = Math.min(100, Math.round((step - 1) * stepShare + within * stepShare));

  // Only announce when the integer percent OR hint actually changes.
  const lastAnnouncedRef = useRef<{ pct: number; hint: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const prev = lastAnnouncedRef.current;
    if (!prev || prev.pct !== pct || prev.hint !== hint) {
      lastAnnouncedRef.current = { pct, hint };
      const completion = pct === 100 ? "Step complete. " : "";
      setAnnouncement(`${completion}Builder progress ${pct} percent. ${hint}`);
    }
  }, [pct, hint]);

  const complete = pct === 100;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          Builder progress
          {complete && (
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[color:var(--gold)] text-[color:var(--ivory)] builder-complete-pop"
            >
              <Check size={10} strokeWidth={3.5} />
            </span>
          )}
        </span>
        <span className="tabular-nums text-[color:var(--charcoal)]/70">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Builder progress"
        className={[
          "mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--charcoal)]/10 transition-shadow",
          complete ? "shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_22%,transparent)]" : "",
        ].join(" ")}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[color:var(--gold-soft)] to-[color:var(--gold)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[color:var(--charcoal)]/60 leading-snug">{hint}</p>
      {complete && (
        <p
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal)] builder-complete-fade"
          aria-hidden="true"
        >
          <Sparkles size={11} />
          Ready — next step unlocked
        </p>
      )}
      {/* Single polite live region — only changes when integer pct/hint changes. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
