import type { ComposableDisplayLine } from "./useResolvedJourney";

function eur(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

/**
 * Explicit line items for owner-priced composed moments. Every euro that the
 * checkout request carries for a composed stop must be visible here first.
 */
export function ComposableLineItems({
  lines,
  testId = "studio-v3-composable-lines",
  className,
}: {
  lines: readonly ComposableDisplayLine[];
  testId?: string;
  className?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className={className} data-testid={testId}>
      <p
        className="mb-2 text-[12px] uppercase tracking-[0.2em]"
        style={{ color: "var(--charcoal-soft)" }}
      >
        Added moments
      </p>
      <ul className="space-y-1 text-[14.5px] leading-[1.55]" style={{ color: "var(--charcoal)" }}>
        {lines.map((l) => (
          <li
            key={l.stopId}
            data-testid="studio-v3-composable-line"
            data-stop-id={l.stopId}
            data-amount-eur={l.totalEur}
            className="flex justify-between gap-3"
          >
            <span className="min-w-0">
              · {l.label}
              <span className="ml-1 tabular-nums" style={{ color: "var(--charcoal-soft)" }}>
                ({eur(l.unitEur)}
                {l.quantity > 1 ? ` × ${l.quantity}` : ""})
              </span>
            </span>
            <span className="text-right font-medium tabular-nums">{eur(l.totalEur)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
