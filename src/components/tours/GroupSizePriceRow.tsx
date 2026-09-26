import type { SignatureTour } from "@/data/signatureTours";
import { resolvePerPaxEur } from "@/data/signatureTourPricing";
import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import { PriceEur } from "@/components/ui/PriceEur";

/**
 * Compact "Price per person by group size" row shown directly above the
 * Signature booking widget. Display-only: it reads the same resolver the
 * widget and checkout use, and groups consecutive party sizes that share
 * the same saved adult rate (e.g. 2 · 3–5 · 6–8). Never invents a tier.
 */
export function GroupSizePriceRow({ tour }: { tour: SignatureTour }) {
  const { data: tierOverrides } = useTourPriceTiers();
  const bands: { from: number; to: number; eur: number }[] = [];
  for (let n = 2; n <= 8; n++) {
    const r = resolvePerPaxEur(tour, n, tierOverrides);
    if (!r) continue;
    const last = bands[bands.length - 1];
    if (last && last.eur === r.eurPerPax && last.to === n - 1) last.to = n;
    else bands.push({ from: n, to: n, eur: r.eurPerPax });
  }
  if (bands.length < 2) return null;
  return (
    <div
      data-testid="group-size-price-row"
      className="container-x max-w-6xl pt-8"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
        Price per person by group size
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[color:var(--charcoal)]">
        {bands.map((b) => (
          <li key={b.from} className="tabular-nums">
            <span className="text-[color:var(--charcoal-soft)]">
              {b.from === b.to ? b.from : `${b.from}–${b.to}`} travellers ·{" "}
            </span>
            <PriceEur amountEur={b.eur} role="tier" />
          </li>
        ))}
      </ul>
    </div>
  );
}
