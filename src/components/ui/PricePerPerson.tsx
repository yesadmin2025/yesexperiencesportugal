import * as React from "react";
import { cn } from "@/lib/utils";
import { useCurrency, formatPrice } from "@/lib/currency";

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
 * Amounts are stored in EUR (source of truth). Display currency follows
 * the CurrencyProvider; when a non-EUR currency is active we suffix a
 * small "Charged in EUR" hint so guests understand USD is indicative.
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

function useMoney() {
  const { currency } = useCurrency();
  const fmt = React.useCallback((n: number) => formatPrice(n, { currency }), [currency]);
  return { fmt, currency };
}

export function PricePerPerson(props: PricePerPersonProps) {
  const { fmt, currency } = useMoney();
  const eur = fmt;
  const showFx = currency !== "EUR";
  const chargedHint = showFx ? (
    <span className="ml-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]/80">
      · charged in EUR
    </span>
  ) : null;

  if (props.variant === "card") {
    return (
      <span
        data-price-eur={props.fromEur}
        data-price-variant="card"
        className={cn(
          "inline-flex items-baseline gap-1 text-[color:var(--charcoal)] normal-case tracking-normal",
          props.className,
        )}
      >
        <span className="text-[14px] font-medium">From {eur(props.fromEur)}</span>
        <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
          per person
        </span>
      </span>
    );
  }

  if (props.variant === "hero") {
    return (
      <span
        data-price-eur={props.fromEur}
        data-price-variant="hero"
        className={cn(
          "inline-flex items-baseline gap-1.5 text-[color:var(--charcoal)] normal-case tracking-normal",
          props.className,
        )}
      >
        <span className="serif text-[16px] sm:text-[17px] font-medium">
          From {eur(props.fromEur)}
        </span>
        <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
          per person
        </span>
        {chargedHint}
      </span>
    );
  }

  const { perPaxEur, guests, partyTotalEur, indicative, hasMinors, className } = props;
  return (
    <div className={cn("space-y-1.5", className)} data-price-variant="form">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
          {guests > 0 ? `For ${guests} ${guests === 1 ? "guest" : "guests"}` : "From"}
          {" · per person"}
        </span>
        <span
          data-price-eur={perPaxEur}
          data-price-role="per-pax"
          className="serif text-[1.4rem] text-[color:var(--charcoal)]"
        >
          {eur(perPaxEur)}
        </span>
      </div>
      {partyTotalEur != null && guests > 1 ? (
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
            Party total{indicative ? " (indicative)" : ""}
          </span>
          <span
            data-price-eur={partyTotalEur}
            data-price-role="party-total"
            className="serif text-[1.05rem] text-[color:var(--charcoal)]"
          >
            {eur(partyTotalEur)}
            <span className="ml-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] font-sans not-italic">
              {hasMinors ? "age-based pricing" : `${eur(perPaxEur)} × ${guests}`}
            </span>
          </span>
        </div>
      ) : null}
      {showFx && (
        <p className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]/80">
          Indicative {currency} · charged in EUR
        </p>
      )}
    </div>
  );
}

export default PricePerPerson;
