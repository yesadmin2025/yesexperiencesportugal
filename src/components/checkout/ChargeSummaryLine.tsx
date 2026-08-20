/**
 * "Total today · €X" — the single, unambiguous charge line shown
 * immediately above the confirm CTA in every instant-book path
 * (Signature, Tailored Signature, Studio), with a compact expandable
 * breakdown (per-pax, minors, add-ons, party total).
 *
 * The amount is always supplied by the flow's own Stripe math, so the
 * number here and the number Stripe charges can never disagree.
 * When the flow cannot price the current selection yet (incomplete
 * child ages, manual-confirmation supplier), pass `quote={null}` and a
 * neutral reassurance line is rendered instead.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface ChargeAdjustment {
  /** Guest-facing label, e.g. "Included lunch removed". */
  readonly label: string;
  /** Party amount in EUR. Negative for credits. */
  readonly amountEur: number;
}

export interface ChargeQuote {
  /** Party total in EUR — exactly what is sent to Stripe. */
  readonly totalEur: number;
  /** Per-adult EUR unit used to build the total. */
  readonly perPaxAdultEur: number;
  /** True when at least one minor is on the booking. */
  readonly hasMinors: boolean;
  /** Adults on the booking — used for the supporting line. */
  readonly adults: number;
  /** Minors on the booking (optional, for the breakdown). */
  readonly minors?: number;
  /** Experience subtotal before add-ons (optional). */
  readonly journeySubtotalEur?: number;
  /** Add-on party total in EUR (optional). */
  readonly addOnsEur?: number;
  /** Named adjustments (e.g. lunch removal) shown as their own rows. */
  readonly adjustments?: readonly ChargeAdjustment[];
}

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
      <span className="min-w-0 break-words leading-snug text-[color:var(--charcoal-soft)]">
        {label}
      </span>
      <span className="shrink-0 tabular-nums text-[color:var(--charcoal)]">{value}</span>
    </li>
  );
}

export function ChargeSummaryLine({
  quote,
  className = "",
}: {
  quote: ChargeQuote | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!quote) {
    return (
      <div
        data-testid="charge-summary-line"
        data-total-eur=""
        aria-live="polite"
        className={[
          "border border-[color:var(--border)] bg-[color:var(--sand)]/50 px-3 py-2 text-center",
          className,
        ].join(" ")}
      >
        <p className="text-[11px] leading-snug text-[color:var(--charcoal-soft)]">
          Final price confirmed before payment — add an age for every child so we can price
          honestly.
        </p>
      </div>
    );
  }

  const minors = quote.minors ?? 0;
  const addOns = quote.addOnsEur ?? 0;
  const journey = quote.journeySubtotalEur ?? quote.totalEur - addOns;

  return (
    <div
      data-testid="charge-summary-line"
      data-total-eur={Math.round(quote.totalEur)}
      aria-live="polite"
      className={[
        "border border-[color:var(--border)] bg-[color:var(--sand)]/50 px-3 py-2",
        className,
      ].join(" ")}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <span className="min-w-0 text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          Final price
        </span>
        <span
          key={Math.round(quote.totalEur)}
          className="serif shrink-0 text-[1.15rem] leading-none text-[color:var(--charcoal)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        >
          {eur(quote.totalEur)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="charge-summary-toggle"
        className="mt-1 grid min-h-[44px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-left text-[10.5px] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
      >
        <span className="min-w-0 break-words leading-snug">
          {quote.adults} {quote.adults === 1 ? "adult" : "adults"}
          {minors > 0 ? ` · ${minors} ${minors === 1 ? "child" : "children"}` : ""} ·{" "}
          {eur(quote.perPaxAdultEur)} per adult
        </span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          data-testid="charge-summary-breakdown"
          className="mt-1 max-h-[30vh] space-y-1 overflow-y-auto overscroll-contain border-t border-[color:var(--border)] pt-1.5 text-[11px]"
        >
          <Row
            label={`Per adult × ${quote.adults}`}
            value={eur(quote.perPaxAdultEur * quote.adults)}
          />
          {minors > 0 ? (
            <Row
              label={`Children · youth 75% · child 50% · infants free`}
              value={eur(Math.max(0, journey - quote.perPaxAdultEur * quote.adults))}
            />
          ) : null}
          {(quote.adjustments ?? []).map((a) => (
            <Row
              key={a.label}
              label={a.label}
              value={`${a.amountEur < 0 ? "−" : ""}${eur(Math.abs(a.amountEur))}`}
            />
          ))}
          {addOns > 0 ? <Row label="Add-ons" value={eur(addOns)} /> : null}
          <Row label="Party total" value={eur(quote.totalEur)} />
        </ul>
      ) : null}

      <p className="mt-1 text-[9.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]/80">
        Charged securely in EUR · no hidden fees
      </p>
    </div>
  );
}
