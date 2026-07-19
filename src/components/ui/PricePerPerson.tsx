import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PricePerPerson — the single price label used across cards, hero and
 * booking forms so "per person" is always the primary, conversion-safe
 * number and no surface silently reads as a party total.
 *
 * Variants:
 *   • "card"  — inline chip inside a meta strip (experiences/day-tours cards)
 *   • "hero"  — larger chip beside the H1 (Signature detail hero)
 *   • "form"  — two-row form summary (per-person + optional party total)
 *
 * All variants suffix the amount with "per person" in charcoal-soft micro
 * copy so the number keeps its visual weight while the unit stays explicit.
 */

interface CardProps {
  variant: "card";
  fromEur: number;
  className?: string;
}

interface HeroProps {
  variant: "hero";
  fromEur: number;
  className?: string;
}

interface FormProps {
  variant: "form";
  perPaxEur: number;
  guests: number;
  partyTotalEur?: number | null;
  /** When true, mark the party total as indicative (parity with Tailor). */
  indicative?: boolean;
  hasMinors?: boolean;
  className?: string;
}

export type PricePerPersonProps = CardProps | HeroProps | FormProps;

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;

export function PricePerPerson(props: PricePerPersonProps) {
  if (props.variant === "card") {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1 text-[color:var(--charcoal)] normal-case tracking-normal",
          props.className,
        )}
      >
        <span className="text-[13px] font-medium">From {eur(props.fromEur)}</span>
        <span className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
          per person
        </span>
      </span>
    );
  }

  if (props.variant === "hero") {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1.5 text-[color:var(--charcoal)] normal-case tracking-normal",
          props.className,
        )}
      >
        <span className="serif text-[15px] sm:text-[16px] font-medium">
          From {eur(props.fromEur)}
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
          per person
        </span>
      </span>
    );
  }

  const { perPaxEur, guests, partyTotalEur, indicative, hasMinors, className } = props;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
          {guests > 0 ? `For ${guests} ${guests === 1 ? "guest" : "guests"}` : "From"}
          {" · per person"}
        </span>
        <span className="serif text-[1.4rem] text-[color:var(--charcoal)]">{eur(perPaxEur)}</span>
      </div>
      {partyTotalEur != null && guests > 1 ? (
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
            Party total{indicative ? " (indicative)" : ""}
          </span>
          <span className="serif text-[1.05rem] text-[color:var(--charcoal)]">
            {eur(partyTotalEur)}
            <span className="ml-1.5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] font-sans not-italic">
              {hasMinors ? "age-based pricing" : `${eur(perPaxEur)} × ${guests}`}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default PricePerPerson;
