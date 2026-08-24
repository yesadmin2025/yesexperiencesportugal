import type { ChoiceOption } from "./types";

/**
 * ChoiceGrid — the editorial selector used by every Studio V3 question phase.
 *
 * Renders a sentence-case label (editorial) + an Inter whisper subtitle on a
 * quiet page-like surface. No checkboxes, no dropdowns, no floating cards.
 * Options fade-rise on mount in a staggered cadence (max ~360ms total) and
 * respect prefers-reduced-motion.
 *
 * Single-select (default): pass `value` + `onSelect`.
 * Multi-select: pass `mode="multi"`, `values`, `onToggle`. Visual language is
 * identical — the gold dot indicator simply reflects each option's selected
 * state. No badges, no counts, no checkboxes.
 */
interface ChoiceGridProps<T extends string> {
  options: ChoiceOption<T>[];
  /** Single-select value (ignored in multi mode). */
  value?: T | null;
  /** Single-select handler (ignored in multi mode). */
  onSelect?: (id: T) => void;
  /** Multi-select values (used only in multi mode). */
  values?: T[];
  /** Multi-select toggle handler (used only in multi mode). */
  onToggle?: (id: T) => void;
  mode?: "single" | "multi";
  columns?: 1 | 2;
  /**
   * Multi-select cap. When reached, unselected options render disabled (dimmed,
   * not interactive) so the user sees the ceiling without a toast.
   */
  maxSelected?: number;
}

export function ChoiceGrid<T extends string>({
  options,
  value,
  onSelect,
  values,
  onToggle,
  mode = "single",
  columns = 2,
  maxSelected,
}: ChoiceGridProps<T>) {
  const isMulti = mode === "multi";
  const atCap =
    isMulti && typeof maxSelected === "number" && Array.isArray(values)
      ? values.length >= maxSelected
      : false;

  return (
    <ul
      className={`mt-8 grid w-full max-w-[520px] gap-x-4 gap-y-0 ${
        columns === 2 ? "grid-cols-2" : "grid-cols-1"
      }`}
      role={isMulti ? "group" : "radiogroup"}
    >
      {options.map((opt, i) => {
        const selected = isMulti
          ? Array.isArray(values) && values.includes(opt.id)
          : value === opt.id;
        const lockedByCap = isMulti && atCap && !selected;

        return (
          <li key={opt.id}>
            <button
              type="button"
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={selected}
              aria-disabled={lockedByCap || undefined}
              disabled={lockedByCap}
              data-testid="studio-v3-choice"
              data-phase-cta="choice"
              data-option-id={opt.id}
              data-selected={selected ? "true" : "false"}
              data-locked={lockedByCap ? "true" : "false"}
              onClick={() => {
                if (lockedByCap) return;
                if (isMulti) onToggle?.(opt.id);
                else onSelect?.(opt.id);
              }}
              className="group relative w-full min-h-[64px] border-0 border-b px-3 py-4 text-left transition-[border-color,background-color,opacity] duration-[220ms] ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed"
              style={{
                background: selected
                  ? "color-mix(in oklab, var(--teal) 5%, transparent)"
                  : "transparent",
                borderColor: selected
                  ? "color-mix(in oklab, var(--teal) 78%, transparent)"
                  : "color-mix(in oklab, var(--charcoal) 16%, transparent)",
                opacity: lockedByCap ? 0.45 : 1,
                animation: `studioV3RiseIn 420ms ease-out ${60 + i * 45}ms both`,
              }}
            >
              <span
                className="block text-[15px] leading-tight font-semibold"
                style={{
                  fontFamily: "var(--font-editorial)",
                  color: "var(--charcoal)",
                  letterSpacing: "-0.005em",
                }}
              >
                {opt.label}
              </span>
              <span
                className="mt-1 block text-[12.5px] leading-snug"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "color-mix(in oklab, var(--charcoal) 74%, transparent)",
                }}
              >
                {opt.whisper}
              </span>
              {selected ? (
                <span
                  aria-hidden
                  className="absolute right-3 top-4 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
