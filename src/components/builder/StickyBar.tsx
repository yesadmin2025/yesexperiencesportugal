import { Clock, Minus, Plus, Users } from "lucide-react";
import { fmtMinutes } from "./types";
import { CtaButton } from "@/components/ui/CtaButton";

interface Props {
  totalMinutes: number;
  pricePerPersonEur: number;
  guests: number;
  setGuests: (n: number) => void;
  onConfirm: () => void;
  /** Disable the confirm CTA when route is loading or infeasible. */
  disabled?: boolean;
  /** Label for primary CTA — varies by booking truth (test mode allowed). */
  ctaLabel?: string;
}

/**
 * Persistent bottom bar: duration · price · guests · confirm.
 * On mobile this is the only thing that needs to feel anchored;
 * the rest of the page can scroll behind it.
 */
export function StickyBar({
  totalMinutes,
  pricePerPersonEur,
  guests,
  setGuests,
  onConfirm,
  disabled,
  ctaLabel = "Confirm experience",
}: Props) {
  const total = pricePerPersonEur * guests;
  return (
    <div
      className="sticky bottom-0 z-40 border-t border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--ivory)]/85"
      role="region"
      aria-label="Experience summary"
    >
      <div className="container-x flex items-center justify-between gap-2 sm:gap-3 py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4 text-[color:var(--charcoal)]">
          <span className="inline-flex items-center gap-1 text-[11.5px] sm:text-[12px]">
            <Clock size={12} className="text-[color:var(--text-muted)]" />
            <span className="tabular-nums font-semibold">{fmtMinutes(totalMinutes)}</span>
          </span>

          <span className="inline-flex items-center gap-0.5 rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-0.5 py-0.5">
            <button
              type="button"
              onClick={() => setGuests(Math.max(1, guests - 1))}
              aria-label="Remove guest"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/65 hover:text-[color:var(--charcoal)]"
            >
              <Minus size={11} />
            </button>
            <span className="inline-flex items-center gap-0.5 px-1 text-[11.5px] tabular-nums font-semibold">
              <Users size={10} className="text-[color:var(--text-muted)]" />
              {guests}
            </span>
            <button
              type="button"
              onClick={() => setGuests(Math.min(12, guests + 1))}
              aria-label="Add guest"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/65 hover:text-[color:var(--charcoal)]"
            >
              <Plus size={11} />
            </button>
          </span>

          <span className="flex flex-col leading-tight">
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--text-muted)]">
              From
            </span>
            <span className="text-[14px] sm:text-[15px] tabular-nums font-semibold text-[color:var(--charcoal)]">
              €{total}
              <span className="ml-1 hidden sm:inline text-[11px] font-normal text-[color:var(--text-muted)]">
                total
              </span>
            </span>
          </span>
        </div>

        <CtaButton
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          variant="primary"
          size="sm"
          className="shrink-0 px-3.5 sm:px-7"
        >
          {ctaLabel}
        </CtaButton>
      </div>
    </div>
  );
}
