/**
 * PerPersonBands — compact per-person price lines by band.
 *
 * Replaces the misleading blended "€X / guest" average that used to appear
 * under totals. Shows the real adult unit price and, when minors are in the
 * party, one additional line per minor band (Youth / Child / Infant) with
 * the band-adjusted unit price.
 *
 * When journeyLines are absent (legacy adults-only bookings), falls back to
 * a single "€X / adult" line using `adultUnitEur`.
 */

import {
  hasCompleteJourneyPricing,
  type CheckoutJourneyLine,
  type JourneyBand,
} from "@/lib/checkout/journeyDisplay";

export interface PerPersonBandsProps {
  readonly journeyLines?: readonly CheckoutJourneyLine[] | null;
  readonly adultUnitEur?: number | null;
  readonly className?: string;
  readonly rowClassName?: string;
  readonly testId?: string;
}

const BAND_LABEL: Record<JourneyBand, string> = {
  adult: "adult",
  youth: "youth",
  child: "child",
  infant: "infant",
};

const BAND_ORDER: Record<JourneyBand, number> = {
  adult: 0,
  youth: 1,
  child: 2,
  infant: 3,
};

function fmt(n: number): string {
  return `€${Math.round(n).toLocaleString("en-GB")}`;
}

interface BandRow {
  band: JourneyBand;
  label: string;
  unitEur: number;
}

export function bandRowsFromJourney(
  journeyLines?: readonly CheckoutJourneyLine[] | null,
): BandRow[] {
  if (!hasCompleteJourneyPricing(journeyLines)) return [];
  const seen = new Map<JourneyBand, number>();
  for (const l of journeyLines!) {
    if (!seen.has(l.band)) seen.set(l.band, l.unitEur);
  }
  return [...seen.entries()]
    .map(([band, unitEur]) => ({ band, label: BAND_LABEL[band], unitEur }))
    .sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band]);
}

export function PerPersonBands({
  journeyLines,
  adultUnitEur,
  className,
  rowClassName,
  testId = "per-person-bands",
}: PerPersonBandsProps) {
  const rows = bandRowsFromJourney(journeyLines);
  if (rows.length === 0) {
    if (adultUnitEur == null || !Number.isFinite(adultUnitEur)) return null;
    return (
      <span className={className} data-testid={testId}>
        <span className={rowClassName} data-band="adult">
          {fmt(adultUnitEur)} / adult
        </span>
      </span>
    );
  }
  return (
    <span className={className} data-testid={testId}>
      {rows.map((r, i) => (
        <span
          key={r.band}
          className={rowClassName}
          data-band={r.band}
          data-unit-eur={r.unitEur}
          style={i > 0 ? { display: "block" } : undefined}
        >
          {fmt(r.unitEur)} / {r.label}
        </span>
      ))}
    </span>
  );
}

export default PerPersonBands;
