import type { ChoiceOption } from "./types";

/**
 * ChoiceGrid — the editorial selector used by Phases 1–3.
 *
 * Renders a sentence-case label + a Georgia-italic whisper subtitle inside a
 * tactile tile. No checkboxes, no dropdowns. Tiles fade-rise on mount in a
 * staggered cadence (max ~360ms total) and respect prefers-reduced-motion.
 */
interface ChoiceGridProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T | null;
  onSelect: (id: T) => void;
  columns?: 1 | 2;
}

export function ChoiceGrid<T extends string>({
  options,
  value,
  onSelect,
  columns = 2,
}: ChoiceGridProps<T>) {
  return (
    <ul
      className={`mt-8 grid w-full max-w-[520px] gap-3 ${
        columns === 2 ? "grid-cols-2" : "grid-cols-1"
      }`}
      role="radiogroup"
    >
      {options.map((opt, i) => {
        const selected = value === opt.id;
        return (
          <li key={opt.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(opt.id)}
              className="group relative w-full text-left px-4 py-3.5 min-h-[64px] border transition-[transform,border-color,background-color,box-shadow] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                background: selected
                  ? "color-mix(in oklab, var(--teal) 6%, var(--ivory))"
                  : "var(--ivory)",
                borderColor: selected ? "var(--teal)" : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                boxShadow: selected
                  ? "0 14px 30px -18px color-mix(in oklab, var(--teal) 50%, transparent)"
                  : "0 6px 18px -14px rgba(46,46,46,0.18)",
                animation: "studioV3RiseIn 420ms ease-out both",
                animationDelay: `${60 + i * 45}ms`,
              }}
            >
              <span
                className="block text-[14px] leading-tight font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--charcoal)",
                  letterSpacing: "-0.005em",
                }}
              >
                {opt.label}
              </span>
              <span
                className="mt-1 block text-[12px] leading-snug italic"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
                }}
              >
                {opt.whisper}
              </span>
              {selected ? (
                <span
                  aria-hidden
                  className="absolute right-3 top-3 inline-block h-1.5 w-1.5 rounded-full"
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
