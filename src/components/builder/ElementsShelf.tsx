import { Check } from "lucide-react";
import { BUILDER_ELEMENTS, type ElementKey } from "./elements";

interface Props {
  selected: ElementKey[];
  onToggle: (key: ElementKey) => void;
}

/**
 * Horizontal-scrolling "Add to your day" rail.
 *
 * - Bounded: 6 fixed elements (no invented add-ons).
 * - Each card flags "Concierge confirms" — no prices shown until live data.
 * - Allowed motion only: hover lift -2px, ≤220ms, fade.
 * - Mobile-first: full-width snap scroll; desktop reflows to a 3-col grid.
 */
export function ElementsShelf({ selected, onToggle }: Props) {
  return (
    <section aria-labelledby="builder-elements-title">
      <div className="flex items-baseline justify-between">
        <span
          id="builder-elements-title"
          className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]"
        >
          Add to your day
        </span>
        <span className="text-[11px] text-[color:var(--charcoal)]/50">Concierge confirms</span>
      </div>

      {/* Mobile: snap-scroll rail. lg: 3-col grid. */}
      <ul
        className={[
          "mt-3 -mx-5 px-5 flex gap-2.5 overflow-x-auto snap-x snap-mandatory",
          "lg:mx-0 lg:px-0 lg:overflow-visible lg:grid lg:grid-cols-3 lg:gap-2.5",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {BUILDER_ELEMENTS.map((el) => {
          const Icon = el.icon;
          const active = selected.includes(el.key);
          return (
            <li key={el.key} className="snap-start shrink-0 w-[68%] sm:w-[44%] lg:w-auto">
              <button
                type="button"
                onClick={() => onToggle(el.key)}
                aria-pressed={active}
                className={[
                  "group relative w-full h-full text-left rounded-[2px] border p-3 transition-all duration-200",
                  "hover:-translate-y-0.5",
                  active
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/8 ring-1 ring-[color:var(--gold)]/40"
                    : "border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] hover:border-[color:var(--charcoal)]/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/60",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon
                    size={15}
                    strokeWidth={1.6}
                    className={
                      active ? "text-[color:var(--gold)]" : "text-[color:var(--charcoal)]/55"
                    }
                  />
                  {active && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--gold)] text-[color:var(--charcoal)]">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px] font-semibold text-[color:var(--charcoal)] leading-tight">
                  {el.label}
                </p>
                <p className="mt-1 text-[11.5px] text-[color:var(--charcoal)]/65 leading-snug">
                  {el.sub}
                </p>
                <p className="mt-2 text-[9.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/45">
                  Concierge confirms
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
