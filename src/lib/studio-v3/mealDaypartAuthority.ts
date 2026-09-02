/**
 * P0-C — CENTRAL MEAL / DAYPART AUTHORITY.
 *
 * A table is not a positional afterthought: it belongs around the believable
 * middle of the day, after the morning segment and before the afternoon
 * moments. This module owns that ONE deterministic placement rule and nothing
 * else.
 *
 * It does NOT:
 *  - invent a restaurant booking time, supplier availability or a reservation;
 *  - add, remove, substitute or re-time any moment (dwell minutes travel
 *    through untouched);
 *  - touch market/morning-only rules (a `market` moment is not a meal, so the
 *    Mercado do Livramento morning rule in `livingAtlasSchedule` is unaffected).
 *
 * It only reorders an already-composed day so a selected meal sits at the
 * cumulative-time midpoint, and never as the final moment.
 */

const FALLBACK_DWELL_MIN = 60;

export interface MealDaypartOptions<T> {
  /** True when this moment is a verified meal/table moment. */
  isMeal: (item: T) => boolean;
  /** Proven dwell minutes for this moment, when known. */
  minutesOf: (item: T) => number | null | undefined;
}

/**
 * The index a single meal should occupy inside `others` (the non-meal moments,
 * in their authored order). Deterministic, pure.
 *
 * The meal lands before the first moment that would push the day past half of
 * its cumulative dwell, clamped so it is never the opening moment and never
 * the closing one when an afternoon actually exists.
 */
export function middayInsertIndex(minutes: ReadonlyArray<number>): number {
  const n = minutes.length;
  if (n === 0) return 0;
  if (n === 1) return 1;
  const total = minutes.reduce((sum, m) => sum + m, 0);
  const half = total / 2;
  let cumulative = 0;
  let index = 1;
  for (let i = 0; i < n; i += 1) {
    cumulative += minutes[i]!;
    if (cumulative >= half) {
      index = i + 1;
      break;
    }
  }
  // Never first, never last: a meal always has a morning before it and at
  // least one afternoon moment after it.
  return Math.min(Math.max(index, 1), n - 1);
}

/**
 * Reorder a composed day so its meal moment sits around midday.
 *
 * - No meal, or a day too short to have a middle, is returned untouched
 *   (same array identity is not guaranteed; contents and order are).
 * - Several meals keep their relative order; only the first is repositioned,
 *   because competing lunches are a structural product fact, not something to
 *   be reshuffled here.
 */
export function scheduleMealAtMidday<T>(
  items: ReadonlyArray<T>,
  options: MealDaypartOptions<T>,
): T[] {
  const list = [...items];
  if (list.length < 3) return list;

  const mealIndex = list.findIndex((item) => options.isMeal(item));
  if (mealIndex < 0) return list;

  const meal = list[mealIndex]!;
  const others = list.filter((_, i) => i !== mealIndex);
  const minutes = others.map((item) => {
    const m = options.minutesOf(item);
    return typeof m === "number" && Number.isFinite(m) && m > 0 ? m : FALLBACK_DWELL_MIN;
  });

  const target = middayInsertIndex(minutes);
  if (target === mealIndex) return list;

  return [...others.slice(0, target), meal, ...others.slice(target)];
}
