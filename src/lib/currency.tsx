/**
 * Currency context — indicative EUR ↔ USD display toggle.
 *
 * Persists the user's choice in BOTH localStorage and a cookie so the
 * preference survives refreshes, cross-page navigation, and cookie-only
 * privacy modes. All checkout, PDFs and emails remain in EUR (source of
 * truth). USD is display-only; when active, callers should surface a
 * small "Charged in EUR" hint.
 */

import * as React from "react";
import { FX_BASE, FX_RATES, type Currency } from "@/config/fx-rates";

export const CURRENCY_STORAGE_KEY = "yes.currency.v1";
export const CURRENCY_COOKIE = "yes.currency.v1";
const CURRENCIES: Currency[] = ["EUR", "USD"];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function readStoredCurrency(): Currency | null {
  try {
    const ls =
      typeof window !== "undefined" ? window.localStorage.getItem(CURRENCY_STORAGE_KEY) : null;
    if (ls && (CURRENCIES as string[]).includes(ls)) return ls as Currency;
  } catch {
    /* private mode / disabled */
  }
  const ck = readCookie(CURRENCY_COOKIE);
  if (ck && (CURRENCIES as string[]).includes(ck)) return ck as Currency;
  return null;
}

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  supported: readonly Currency[];
  /** Announce a message through the shared polite live region. */
  announce: (message: string) => void;
  /** Stable id of the shared "Indicative conversion" describedby helper. */
  describedById: string;
}

const CurrencyContext = React.createContext<CurrencyContextValue>({
  currency: FX_BASE,
  setCurrency: () => {},
  supported: CURRENCIES,
  announce: () => {},
  describedById: "yes-currency-desc",
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer: on the client, read the persisted value up-front so
  // there is no EUR → USD flicker on first paint / route change. On the
  // server, `typeof window` is undefined and we fall back to FX_BASE —
  // which matches what the client would render before hydration when
  // nothing is stored, so hydration attributes still match.
  const [currency, setCurrencyState] = React.useState<Currency>(() => {
    if (typeof window === "undefined") return FX_BASE;
    return readStoredCurrency() ?? FX_BASE;
  });
  const [announcement, setAnnouncement] = React.useState<string>("");

  // Belt-and-braces sync after mount for the SSR path where the initial
  // client render used FX_BASE. Wrapped in an effect so it only runs
  // client-side; setState is a no-op when values match.
  React.useEffect(() => {
    const stored = readStoredCurrency();
    if (stored && stored !== currency) setCurrencyState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrency = React.useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, c);
    } catch {
      /* no-op */
    }
    try {
      const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
    } catch {
      /* no-op */
    }
  }, []);

  const announce = React.useCallback((message: string) => {
    // Reset first so identical repeat announcements still fire in AT.
    setAnnouncement("");
    // Next tick.
    setTimeout(() => setAnnouncement(message), 30);
  }, []);

  const describedById = "yes-currency-desc";

  const value = React.useMemo(
    () => ({ currency, setCurrency, supported: CURRENCIES, announce, describedById }),
    [currency, setCurrency, announce],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
      {/* Single app-level polite live region. Deduplicates announcements
          when multiple currency chips are mounted on the same page. */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-currency-live
      >
        {announcement}
      </span>
      {/* Shared describedby target so every currency button reassures the
          traveller that the change is display-only. */}
      <span id={describedById} className="sr-only">
        Indicative conversion. Checkout remains in euros.
      </span>
    </CurrencyContext.Provider>
  );
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
