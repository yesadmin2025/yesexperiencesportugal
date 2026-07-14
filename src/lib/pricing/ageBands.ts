// Age-band pricing rules — applied uniformly to every Signature tour.
// Internal, brand-owned. NO external pricing dependency.

export type AgeBand = "adult" | "youth" | "child" | "infant";

export interface AgeBandDef {
  band: AgeBand;
  label: string;
  minAge: number;
  maxAge: number;
  /** Fraction of the adult per-pax rate. Infants are always 0 (free). */
  multiplier: number;
  /** When false, the guest is not counted for party-size tier resolution. */
  countsForPartySize: boolean;
}

/** Ordered from oldest to youngest so bandForAge finds the correct match. */
export const AGE_BANDS: readonly AgeBandDef[] = [
  { band: "adult", label: "Adult", minAge: 18, maxAge: 120, multiplier: 1.0, countsForPartySize: true },
  { band: "youth", label: "Youth (12–17)", minAge: 12, maxAge: 17, multiplier: 0.75, countsForPartySize: true },
  { band: "child", label: "Child (3–11)", minAge: 3, maxAge: 11, multiplier: 0.5, countsForPartySize: true },
  { band: "infant", label: "Infant (0–2)", minAge: 0, maxAge: 2, multiplier: 0, countsForPartySize: false },
] as const;

export function bandForAge(age: number): AgeBandDef {
  if (!Number.isFinite(age) || age < 0) return AGE_BANDS[3]; // treat unknown as infant safe-default
  for (const def of AGE_BANDS) {
    if (age >= def.minAge && age <= def.maxAge) return def;
  }
  return AGE_BANDS[0]; // 18+ default
}

export const ADULT_BAND = AGE_BANDS[0];
