/**
 * Shared journey-line display helpers.
 *
 * Both `SignaturePriceCard` (reveal + refine) and `BrandedCheckoutDrawer`
 * render the traveller breakdown using the exact same aggregation, so the
 * per-adult and per-minor rows shown on the card always match what's
 * itemised on the checkout drawer.
 */

export type JourneyBand = "adult" | "youth" | "child" | "infant";

export interface CheckoutJourneyLine {
  readonly kind: "adult" | "minor";
  readonly band: JourneyBand;
  readonly age: number | null;
  readonly unitEur: number;
  readonly qty: 1;
}

export interface JourneyDisplayRow {
  readonly key: string;
  readonly label: string;
  readonly unitEur: number;
  readonly qty: number;
  readonly subtotalEur: number;
}

const BAND_ORDER: Record<JourneyBand, number> = {
  adult: 0,
  youth: 1,
  child: 2,
  infant: 3,
};

const MINOR_LABEL: Record<Exclude<JourneyBand, "adult">, string> = {
  youth: "Youth",
  child: "Child",
  infant: "Infant",
};

/**
 * Aggregate journey lines into display rows:
 *   - Adults grouped into a single row with a qty count.
 *   - Each minor listed individually with its age + band-adjusted unit price.
 *   - Order: adults → youths → children → infants; minors sorted by age desc
 *     inside their band so older kids read first.
 */
export function summarizeJourneyLines(
  lines: readonly CheckoutJourneyLine[],
): JourneyDisplayRow[] {
  const adults = lines.filter((l) => l.band === "adult");
  const minors = lines
    .filter((l) => l.band !== "adult")
    .slice()
    .sort((a, b) => {
      const oa = BAND_ORDER[a.band] - BAND_ORDER[b.band];
      if (oa !== 0) return oa;
      return (b.age ?? 0) - (a.age ?? 0);
    });

  const rows: JourneyDisplayRow[] = [];
  if (adults.length > 0) {
    const unit = adults[0].unitEur;
    rows.push({
      key: "adults",
      label: `Adult${adults.length === 1 ? "" : "s"}`,
      unitEur: unit,
      qty: adults.length,
      subtotalEur: unit * adults.length,
    });
  }
  for (const m of minors) {
    const bandKey = m.band as "youth" | "child" | "infant";
    const label = m.age != null ? `${MINOR_LABEL[bandKey]} (age ${m.age})` : MINOR_LABEL[bandKey];
    rows.push({
      key: `${m.band}-${m.age ?? "x"}-${rows.length}`,
      label,
      unitEur: m.unitEur,
      qty: 1,
      subtotalEur: m.unitEur,
    });
  }
  return rows;
}
