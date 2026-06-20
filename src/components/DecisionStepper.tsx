import { useEffect, useRef, useState } from "react";

/**
 * DecisionStepper
 *
 * A subtle vertical stepper that floats on the right edge of the viewport
 * while the user is scrolling through the homepage decision-flow section.
 * It tracks which card (Studio, Signature, Tailoring, Multi-day,
 * Celebrations) is currently most visible and highlights the corresponding
 * dot. Clicking a dot smooth-scrolls to that card.
 *
 * Behavior:
 * - Hidden until the decision section enters the viewport.
 * - Auto-hides again when the section leaves.
 * - Uses IntersectionObserver per card to determine the active step
 *   (largest intersection ratio wins).
 * - Respects prefers-reduced-motion for the smooth-scroll interaction.
 */

export type DecisionStep = {
  /** DOM id of the card element */
  id: string;
  /** Short display label (e.g. "Studio") */
  label: string;
};

type Props = {
  /** DOM id of the section that wraps the cards */
  sectionId: string;
  steps: DecisionStep[];
};

/** Runtime guard: keep only well-formed step entries. */
function sanitizeSteps(steps: unknown): DecisionStep[] {
  if (!Array.isArray(steps)) return [];
  const seen = new Set<string>();
  const out: DecisionStep[] = [];
  for (const s of steps) {
    if (!s || typeof s !== "object") continue;
    const id = (s as Record<string, unknown>).id;
    const label = (s as Record<string, unknown>).label;
    if (typeof id !== "string" || !id) continue;
    if (typeof label !== "string" || !label) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
  }
  return out;
}

export function DecisionStepper({ sectionId, steps }: Props) {
  const safeSteps = sanitizeSteps(steps);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(safeSteps[0]?.id ?? null);
  const [hasError, setHasError] = useState(false);
  const ratiosRef = useRef<Map<string, number>>(new Map());

  // Track section visibility — show stepper only while section is on screen.
  useEffect(() => {
    try {
      const section = document.getElementById(sectionId);
      if (!section) return;
      const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
        threshold: 0.05,
      });
      io.observe(section);
      return () => io.disconnect();
    } catch (err) {
      console.warn("[DecisionStepper] section observer failed", err);
      setHasError(true);
    }
  }, [sectionId]);

  // Track which card is most visible.
  useEffect(() => {
    try {
      const els = safeSteps
        .map((s) => document.getElementById(s.id))
        .filter((el): el is HTMLElement => el !== null);
      if (els.length === 0) return;

      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            ratiosRef.current.set(e.target.id, e.intersectionRatio);
          }
          let bestId: string | null = null;
          let bestRatio = 0;
          for (const [id, r] of ratiosRef.current) {
            if (r > bestRatio) {
              bestRatio = r;
              bestId = id;
            }
          }
          if (bestId && bestRatio > 0) setActiveId(bestId);
        },
        {
          threshold: [0, 0.25, 0.5, 0.75, 1],
          rootMargin: "-30% 0px -45% 0px",
        },
      );
      els.forEach((el) => io.observe(el));
      return () => io.disconnect();
    } catch (err) {
      console.warn("[DecisionStepper] card observer failed", err);
      setHasError(true);
    }
  }, [safeSteps]);

  const handleJump = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    } catch (err) {
      console.warn("[DecisionStepper] scroll failed", err);
    }
  };

  // Fallback: render an unobtrusive minimal indicator if something is off
  // (no valid steps, or an observer/runtime error). Never crash the page.
  if (hasError || safeSteps.length === 0) {
    return (
      <nav
        aria-label="Decision flow progress (unavailable)"
        aria-hidden="true"
        className="pointer-events-none fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 opacity-40"
      >
        <span
          className="block w-1.5 h-1.5 rounded-full bg-[color:var(--charcoal)]/30"
          title="Stepper unavailable"
        />
      </nav>
    );
  }

  return (
    <nav
      aria-label="Decision flow progress"
      aria-hidden={!visible}
      className={`pointer-events-none fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <ul className="list-none p-0 m-0 flex flex-col items-end gap-3">
        {safeSteps.map((s) => {
          const isActive = s.id === activeId;
          return (
            <li key={s.id} className="pointer-events-auto">
              <button
                type="button"
                onClick={() => handleJump(s.id)}
                aria-label={`Jump to ${s.label}`}
                aria-current={isActive ? "true" : undefined}
                className="group flex items-center gap-2 py-1 pl-2 pr-1"
              >
                <span
                  className={`text-[10px] uppercase tracking-[0.22em] font-medium transition-all duration-300 ${
                    isActive
                      ? "opacity-100 text-[color:var(--charcoal)] translate-x-0"
                      : "opacity-0 -translate-x-1 text-[color:var(--charcoal-soft)] group-hover:opacity-70 group-hover:translate-x-0"
                  }`}
                >
                  {s.label}
                </span>
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-2.5 h-2.5 bg-[color:var(--gold)] ring-2 ring-[color:var(--gold)]/25"
                      : "w-1.5 h-1.5 bg-[color:var(--charcoal)]/30 group-hover:bg-[color:var(--charcoal)]/60"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
