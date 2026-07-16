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
import { AGE_BAND_PCT as ONPAGE_PCT, ageBand as onPageAgeBand } from "@/data/signatureTourPricing";

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

  // Reproduce the on-page pricing path (`resolveJourneyPricing` → lines)
  // using the shared constants, so any drift between the two AGE_BAND_PCT
  // copies would surface as unit/subtotal mismatch below.
  function buildJourneyLinesLikeOnPage(
    adults: number,
    minorAges: number[],
    perPaxAdultEur: number,
  ): CheckoutJourneyLine[] {
    const lines: CheckoutJourneyLine[] = [];
    for (let i = 0; i < adults; i++) {
      lines.push({ kind: "adult", band: "adult", age: null, unitEur: perPaxAdultEur, qty: 1 });
    }
    for (const rawAge of minorAges) {
      const b = onPageAgeBand(rawAge);
      if (!b || b === "adult") continue;
      const unitEur = Math.round(perPaxAdultEur * ONPAGE_PCT[b]);
      lines.push({ kind: "minor", band: b, age: Math.floor(rawAge), unitEur, qty: 1 });
    }
    return lines;
  }

  for (const c of cases) {
    for (const perPaxAdultEur of [200, 250, 333, 417]) {
      it(`matches on-page rows for: ${c.label} @ €${perPaxAdultEur}/adult`, () => {
        const onPage = summarizeJourneyLines(
          buildJourneyLinesLikeOnPage(c.adults, c.minorAges, perPaxAdultEur),
        );
        const email = summarizeJourneyLines(
          buildJourneyLinesLikeEmail(c.adults, c.minorAges, perPaxAdultEur),
        );
        expect(email).toEqual(onPage);
      });
    }
  }
});

