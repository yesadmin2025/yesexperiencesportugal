/**
 * FX rates — indicative only.
 *
 * Charges are always processed in EUR via Stripe. USD (and any future
 * currency) is a UI-only conversion so international guests can gauge
 * the price at a glance. Rates are versioned in code — no runtime
 * external call, no CLS, no edge failure surface.
 *
 * Rotate every ~30 days. Bump `FX_UPDATED_AT` when you edit `FX_RATES`.
 */

export const FX_BASE = "EUR" as const;

export const FX_RATES = {
  EUR: 1,
  USD: 1.08,
} as const;

export type Currency = keyof typeof FX_RATES;

export const FX_UPDATED_AT = "2026-07-23";
