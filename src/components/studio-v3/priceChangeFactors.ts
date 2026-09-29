/**
 * Price-change factors for the Studio V3 reveal disclosure.
 *
 * Every factor here MUST be derived from the existing pricing truth
 * modules (`@/data/signatureTourPricing`) or from real state the
 * traveller already configured (selected add-ons). No generic
 * "prices may vary" placeholders, no hardcoded discount percentages.
 */

import {
  AGE_BAND_PCT,
  ageBand,
  resolvePerPaxEur,
  type AgeBand,
} from "@/data/signatureTourPricing";
import type { SignatureTour } from "@/data/signatureTours";

export type PriceFactorId = "party_size" | "traveller_ages" | "additions";

export interface PriceChangeFactor {
  readonly id: PriceFactorId;
  readonly text: string;
}

export interface AddOnFactorInput {
  readonly label: string;
  readonly unit?: string | null;
}

/** True when the tour's real tier table actually varies with party size. */
export function partySizeChangesPrice(
  tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined,
): boolean {
  if (!tour) return false;
  const seen = new Set<number>();
  for (let g = 1; g <= 8; g += 1) {
    const r = resolvePerPaxEur(tour, g);
    if (!r || !r.real) continue;
    seen.add(r.eurPerPax);
  }
  return seen.size > 1;
}

/**
 * Derive the real minor bands (label + percentage) straight from
 * `ageBand()` boundaries and `AGE_BAND_PCT`. Never hardcoded.
 */
export function minorBandRules(): ReadonlyArray<{ band: AgeBand; label: string; pct: number }> {
  const runs: Array<{ band: AgeBand; from: number; to: number }> = [];
  for (let age = 0; age <= 17; age += 1) {
    const band = ageBand(age);
    if (!band || band === "adult") continue;
    const last = runs[runs.length - 1];
    if (last && last.band === band && last.to === age - 1) last.to = age;
    else runs.push({ band, from: age, to: age });
  }
  return runs.map((run) => ({
    band: run.band,
    label: run.from === 0 ? `under ${run.to + 1}` : `ages ${run.from}–${run.to}`,
    pct: AGE_BAND_PCT[run.band],
  }));
}

function bandPhrase(rule: { label: string; pct: number }): string {
  if (rule.pct <= 0) return `${rule.label} travel free`;
  return `${rule.label} at ${Math.round(rule.pct * 100)}%`;
}

export interface ResolvePriceFactorsInput {
  readonly tour: Pick<SignatureTour, "id" | "priceFrom"> | null | undefined;
  readonly selectedAddOns: readonly AddOnFactorInput[];
}

/**
 * Return only the price-changing factors that genuinely apply to this
 * product + state. An empty array means the disclosure must not render.
 */
export function resolvePriceChangeFactors({
  tour,
  selectedAddOns,
}: ResolvePriceFactorsInput): PriceChangeFactor[] {
  const factors: PriceChangeFactor[] = [];

  if (partySizeChangesPrice(tour)) {
    factors.push({
      id: "party_size",
      text: "Party size — the per-person rate follows the size of your group.",
    });
  }

  // Age banding only exists when the tour has a resolvable anchor price:
  // that is the same precondition `resolveJourneyPricing` requires.
  // Generic anchor (no party size) — solo may have no approved tier.
  const anchor = resolvePerPaxEur(tour, null);

  const rules = minorBandRules().filter((r) => r.pct !== 1);
  if (anchor && rules.length > 0) {
    factors.push({
      id: "traveller_ages",
      text: `Traveller ages — ${rules.map(bandPhrase).join(", ")}.`,
    });
  }

  if (selectedAddOns.length > 0) {
    const perPerson = selectedAddOns.some((a) => a.unit === "per_person");
    factors.push({
      id: "additions",
      text: `Additions you keep — ${selectedAddOns
        .map((a) => a.label)
        .join(", ")} ${selectedAddOns.length === 1 ? "is" : "are"} charged ${
        perPerson ? "per guest" : "per group"
      }.`,
    });
  }

  return factors;
}
