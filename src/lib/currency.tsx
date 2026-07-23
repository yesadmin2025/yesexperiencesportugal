/**
 * Currency context — indicative EUR ↔ USD display toggle.
 *
 * Persists the user's choice in localStorage. All checkout, PDFs and
 * emails remain in EUR (source of truth). USD is display-only; when
 * active, callers should surface a small "Charged in EUR" hint.
 */

import * as React from "react";
import { FX_BASE, FX_RATES, type Currency } from "@/config/fx-rates";

const STORAGE_KEY = "yes.currency.v1";
const CURRENCIES: Currency[] = ["EUR", "USD"];

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  supported: readonly Currency[];
}

const CurrencyContext = React.createContext<CurrencyContextValue>({
  currency: FX_BASE,
  setCurrency: () => {},
  supported: CURRENCIES,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState<Currency>(FX_BASE);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && (CURRENCIES as string[]).includes(stored)) {
        setCurrencyState(stored as Currency);
      }
    } catch {
      /* no-op — private mode / disabled storage */
    }
  }, []);

  const setCurrency = React.useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
      document.cookie = `${STORAGE_KEY}=${c}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
    } catch {
      /* no-op */
    }
  }, []);

  const value = React.useMemo(
    () => ({ currency, setCurrency, supported: CURRENCIES }),
    [currency, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return React.useContext(CurrencyContext);
}

interface FormatOptions {
  currency?: Currency;
  locale?: string;
  /** Round to the nearest whole unit (default true — cleaner display). */
  round?: boolean;
}

/**
 * Format a EUR-denominated amount in the requested currency.
 * Always uses the versioned FX_RATES table (no live lookup).
 */
export function formatPrice(amountEur: number, opts: FormatOptions = {}): string {
  const currency = opts.currency ?? FX_BASE;
  const rate = FX_RATES[currency];
  const converted = amountEur * rate;
  const value = opts.round === false ? converted : Math.round(converted);
  const locale = opts.locale ?? (currency === "USD" ? "en-US" : "en-GB");
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: opts.round === false ? 2 : 0,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    const symbol = currency === "USD" ? "$" : "€";
    return `${symbol}${Math.round(value).toLocaleString(locale)}`;
  }
}

/** Convenience: format using the current context currency. */
export function useFormatPrice() {
  const { currency } = useCurrency();
  return React.useCallback(
    (amountEur: number, opts?: Omit<FormatOptions, "currency">) =>
      formatPrice(amountEur, { ...opts, currency }),
    [currency],
  );
}
