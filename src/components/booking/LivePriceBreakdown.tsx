// Shared visible price breakdown — Signature summary, Tailored summary,
// Studio Final Signature, Guest Details, Checkout Summary all render this.
// The total shown here MUST equal the Stripe total (enforced server-side).

import type { BookingQuote } from "@/lib/pricing/bookingQuote";

type Props = {
  quote: BookingQuote;
  compact?: boolean;
};

const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const EUR_ZERO = "Free";

function fmt(eur: number): string {
  return eur === 0 ? EUR_ZERO : EUR.format(eur);
}

export function LivePriceBreakdown({ quote, compact = false }: Props) {
  const { basePricing, addOnPricing, finalTotalEur } = quote;

  return (
    <div className="text-[color:var(--charcoal)]">
      {!compact ? (
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          Base private day
        </div>
      ) : null}

      <ul className="divide-y divide-[color:var(--border)]">
        {basePricing.lines.map((l) => (
          <li key={l.bokunCategoryId} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="text-sm">
                {l.label}
                {l.ages && l.ages.length ? (
                  <span className="ml-2 text-[11px] text-[color:var(--charcoal-soft)]">
                    age{l.ages.length > 1 ? "s" : ""} {l.ages.join(", ")}
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                {l.quantity} × {l.unitEur === 0 ? EUR_ZERO : EUR.format(l.unitEur)}
                {typeof l.minAge === "number" || typeof l.maxAge === "number" ? (
                  <>
                    {" · "}
                    {typeof l.minAge === "number" && typeof l.maxAge === "number"
                      ? `${l.minAge}–${l.maxAge}`
                      : typeof l.minAge === "number"
                        ? `${l.minAge}+`
                        : `≤${l.maxAge}`}
                  </>
                ) : null}
              </div>
            </div>
            <div className="tabular-nums text-sm" data-testid={`line-${l.bokunCategoryId}`}>
              {fmt(l.subtotalEur)}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
        <span>Base subtotal</span>
        <span className="tabular-nums" data-testid="base-subtotal">
          {EUR.format(basePricing.subtotalEur)}
        </span>
      </div>

      {addOnPricing.lines.length ? (
        <>
          {!compact ? (
            <div className="mt-4 mb-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Selected add-ons
            </div>
          ) : null}
          <ul className="divide-y divide-[color:var(--border)]">
            {addOnPricing.lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm">{l.label}</div>
                  <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                    {l.quantity} × {EUR.format(l.unitEur)} · {humanUnit(l.pricingUnit)}
                  </div>
                </div>
                <div className="tabular-nums text-sm" data-testid={`addon-${l.id}`}>
                  {EUR.format(l.subtotalEur)}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            <span>Add-ons subtotal</span>
            <span className="tabular-nums" data-testid="addon-subtotal">
              {EUR.format(addOnPricing.subtotalEur)}
            </span>
          </div>
        </>
      ) : null}

      <div className="mt-4 border-t border-[color:var(--charcoal)] pt-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.22em]">Total</span>
        <span className="text-lg tabular-nums font-medium" data-testid="final-total">
          {EUR.format(finalTotalEur)}
        </span>
      </div>
    </div>
  );
}

function humanUnit(u: string): string {
  switch (u) {
    case "per_person": return "per traveller";
    case "per_vehicle": return "per vehicle";
    case "per_group": return "per group";
    case "fixed": return "fixed";
    default: return u;
  }
}
