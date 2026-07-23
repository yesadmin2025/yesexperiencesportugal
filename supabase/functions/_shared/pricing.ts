/**
 * Age-band pricing — single server-side source of truth.
 *
 * Mirrors `AGE_BAND_PCT` / `ageBand()` in `src/data/signatureTourPricing.ts`.
 * Deno edge functions can't import from `src/`, so this file is the
 * canonical copy for every Supabase function that prices minors.
 * If you change these percentages, change the frontend copy in the
 * same commit.
 */

export type AgeBand = "adult" | "youth" | "child" | "infant";

export const AGE_BAND_PCT: Record<AgeBand, number> = {
  adult: 1.0,
  youth: 0.75,
  child: 0.5,
  infant: 0,
};

export function ageBand(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 0 || age > 17 || !Number.isInteger(age)) return null;
  if (age >= 11) return "youth";
  if (age >= 3) return "child";
  return "infant";
}
