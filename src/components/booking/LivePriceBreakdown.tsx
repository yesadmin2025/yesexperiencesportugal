// LivePriceBreakdown — renders an InternalQuote row-by-row.
// No network. No external pricing dependency.

import type { InternalQuote } from "@/lib/pricing/resolveInternalQuote";

export function LivePriceBreakdown({
  quote,
  compact = false,
}: {
  quote: InternalQuote | null;
  compact?: boolean;
}) {
  if (!quote || quote.lines.length === 0) return null;
  const size = compact ? "text-[11.5px]" : "text-[12px]";
  return (
    <div className="space-y-2">
      <ul className={`space-y-1 ${size}`}>
        {quote.lines.map((l) => (
          <li key={l.band} className="flex items-baseline justify-between gap-3">
            <span className="text-[color:var(--charcoal-soft)]">
              {l.label} × {l.quantity}
              {l.isFree ? " · included" : ""}
            </span>
            <span className="tabular-nums">
              {l.isFree ? "Free" : `€${l.subtotalEur.toLocaleString("en-GB")}`}
            </span>
          </li>
        ))}
        {quote.addOnLines.map((a) => (
          <li key={a.id} className="flex items-baseline justify-between gap-3">
            <span className="text-[color:var(--charcoal-soft)]">
              {a.label} × {a.quantity}
            </span>
            <span className="tabular-nums">€{a.subtotalEur.toLocaleString("en-GB")}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between pt-2 border-t border-[color:var(--border)]">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
          Total
        </span>
        <span className="serif text-[1.4rem]">
          €{Math.round(quote.finalTotalEur).toLocaleString("en-GB")}
        </span>
      </div>
    </div>
  );
}
