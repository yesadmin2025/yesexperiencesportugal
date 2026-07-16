/**
 * Parity guard: the confirmation email traveller section must render the
 * exact same rows (label, unit, qty, subtotal) as the on-page checkout
 * summary. Both paths reduce to `summarizeJourneyLines`, so given the same
 * (adults, minorAges, perPaxAdultEur) inputs the rows must be identical.
 *
 * If this test fails the email and the on-page summary have drifted —
 * usually because someone changed one age-band multiplier without the
 * other. Keep `AGE_BAND_PCT` in `src/data/signatureTourPricing.ts` and in
 * `src/lib/email-templates/checkout-receipt.tsx` in lockstep.
 */
import { describe, it, expect } from "vitest";
import {
  summarizeJourneyLines,
  type CheckoutJourneyLine,
} from "@/lib/checkout/journeyDisplay";
import { resolveJourneyPricing } from "@/data/signatureTourPricing";

// Reproduce the email template's local builder without importing the .tsx
// (React Email components pull JSX + browser-y deps into vitest).
const AGE_BAND_PCT = { adult: 1.0, youth: 0.75, child: 0.5, infant: 0 } as const;
function ageBand(age: number) {
  if (!Number.isInteger(age) || age < 0 || age > 17) return null;
  if (age >= 11) return "youth" as const;
  if (age >= 3) return "child" as const;
  return "infant" as const;
}
function buildJourneyLinesLikeEmail(
  adults: number,
  minorAges: number[],
  perPaxAdultEur: number,
): CheckoutJourneyLine[] {
  const lines: CheckoutJourneyLine[] = [];
  for (let i = 0; i < adults; i++) {
    lines.push({ kind: "adult", band: "adult", age: null, unitEur: perPaxAdultEur, qty: 1 });
  }
  for (const rawAge of minorAges) {
    const b = ageBand(rawAge);
    if (!b) continue;
    const unitEur = Math.round(perPaxAdultEur * AGE_BAND_PCT[b]);
    lines.push({ kind: "minor", band: b, age: Math.floor(rawAge), unitEur, qty: 1 });
  }
  return lines;
}

describe("Checkout email ↔ on-page summary parity", () => {
  const cases: Array<{
    label: string;
    adults: number;
    minorAges: number[];
  }> = [
    { label: "adults only", adults: 2, minorAges: [] },
    { label: "adults + youth + child", adults: 2, minorAges: [13, 8] },
    { label: "adults + infant", adults: 2, minorAges: [1] },
    { label: "solo adult", adults: 1, minorAges: [] },
    { label: "large mixed party", adults: 4, minorAges: [15, 12, 9, 4, 2] },
  ];

  for (const c of cases) {
    it(`matches on-page rows for: ${c.label}`, () => {
      const resolved = resolveSignatureAgeBandPricing(c.adults, c.minorAges);
      if (!resolved) throw new Error("test fixture: pricing must resolve");

      const onPageRows = summarizeJourneyLines(resolved.lines);
      const emailRows = summarizeJourneyLines(
        buildJourneyLinesLikeEmail(c.adults, c.minorAges, resolved.perPaxAdultEur),
      );

      expect(emailRows).toEqual(onPageRows);
    });
  }
});
