/**
 * PriceBreakdownRows — live adults vs children price rows.
 *
 * Renders one row per traveller band (adults grouped, minors listed with
 * age + band-adjusted unit price) using the shared aggregation from
 * `journeyDisplay.summarizeJourneyLines`. Values reflect the resolved
 * journey and update automatically when guests, ages or add-ons change,
 * because callers pass `journeyLines` from `useResolvedJourney`.
 *
 * Used by:
 *  - `BrandedCheckoutDrawer` (inline copy, historical; keep in sync)
 *  - `CheckoutSummary` (Studio V3 review step)
 *  - `FinalRevealStory` (Studio V3 reveal)
 */

import {
  summarizeJourneyLines,
  hasCompleteJourneyPricing,
  type CheckoutJourneyLine,
} from "@/lib/checkout/journeyDisplay";

export interface PriceBreakdownRowsProps {
  readonly journeyLines: readonly CheckoutJourneyLine[] | null | undefined;
  readonly label?: string;
  readonly testId?: string;
}

function fmt(n: number): string {
  return `€${Math.round(n).toLocaleString("en-GB")}`;
}

export function PriceBreakdownRows({
  journeyLines,
  label = "Travellers",
  testId = "price-breakdown-rows",
}: PriceBreakdownRowsProps) {
  if (!hasCompleteJourneyPricing(journeyLines)) return null;
  const rows = summarizeJourneyLines(journeyLines!);
  return (
    <div
      className="pt-3 border-t"
      style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
      data-testid={testId}
    >
      <p
        className="text-[10px] uppercase tracking-[0.22em] mb-2"
        style={{ color: "var(--charcoal-soft)" }}
      >
        {label}
      </p>
      <ul className="space-y-1 text-[13.5px]" style={{ color: "var(--charcoal)" }}>
        {rows.map((row) => (
          <li
            key={row.key}
            data-testid="price-breakdown-row"
            data-band={row.key}
            data-qty={row.qty}
            data-unit-eur={row.unitEur}
            data-subtotal-eur={row.subtotalEur}
            className="flex justify-between gap-3"
          >
            <span className="min-w-0">
              · {row.label}
              {row.qty > 1 ? (
                <span className="ml-1 tabular-nums" style={{ color: "var(--charcoal-soft)" }}>
                  ({fmt(row.unitEur)} × {row.qty})
                </span>
              ) : null}
            </span>
            <span
              className="text-right tabular-nums font-medium"
              style={{ color: "var(--charcoal)" }}
            >
              {fmt(row.subtotalEur)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
