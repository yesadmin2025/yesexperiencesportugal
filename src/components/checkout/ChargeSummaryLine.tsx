/**
 * "You'll be charged €X" — the single, unambiguous charge line shown
 * immediately above the confirm CTA in every instant-book path
 * (Signature, Tailored Signature, Studio).
 *
 * The amount is always supplied by the flow's own Stripe math, so the
 * number here and the number Stripe charges can never disagree.
 * When the flow cannot price the current selection yet (incomplete
 * child ages, manual-confirmation supplier), pass `quote={null}` and a
 * neutral reassurance line is rendered instead.
 */

export interface ChargeQuote {
  /** Party total in EUR — exactly what is sent to Stripe. */
  readonly totalEur: number;
  /** Per-adult EUR unit used to build the total. */
  readonly perPaxAdultEur: number;
  /** True when at least one minor is on the booking. */
  readonly hasMinors: boolean;
  /** Adults on the booking — used for the supporting line. */
  readonly adults: number;
}

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

export function ChargeSummaryLine({
  quote,
  className = "",
}: {
  quote: ChargeQuote | null;
  className?: string;
}) {
  return (
    <div
      data-testid="charge-summary-line"
      data-total-eur={quote ? Math.round(quote.totalEur) : ""}
      aria-live="polite"
      className={[
        "border border-[color:var(--border)] bg-[color:var(--sand)]/50 px-4 py-3 text-center",
        className,
      ].join(" ")}
    >
      {quote ? (
        <>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)]">
            You&rsquo;ll be charged
          </p>
          <p
            key={Math.round(quote.totalEur)}
            className="serif mt-1 text-[1.6rem] leading-none text-[color:var(--charcoal)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
          >
            {eur(quote.totalEur)}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-snug text-[color:var(--charcoal-soft)]">
            {quote.adults} {quote.adults === 1 ? "adult" : "adults"} ·{" "}
            {eur(quote.perPaxAdultEur)} per adult
            {quote.hasMinors ? (
              <>
                <br />
                Child pricing applied — youth 75% · child 50% · infants free
              </>
            ) : null}
          </p>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]/80">
            Charged securely in EUR · no hidden fees
          </p>
        </>
      ) : (
        <p className="text-[11.5px] leading-snug text-[color:var(--charcoal-soft)]">
          Final price confirmed before payment — add an age for every child so we can
          price honestly.
        </p>
      )}
    </div>
  );
}
