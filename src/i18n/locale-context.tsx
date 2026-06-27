/**
 * Locale context + useT hook.
 *
 * Routes provide the current locale via <LocaleProvider locale={...}>;
 * everything below reads it via useLocale() / useT().
 *
 * `t(key, vars?)` returns a string with EN fallback when the active
 * locale lacks the key.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { DEFAULT_LOCALE, type Locale } from "./config";
import { getDictionary, translate, type Dictionary } from "./dictionaries";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  dict: getDictionary(DEFAULT_LOCALE),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dict: getDictionary(locale) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

/**
 * Translation hook. Returns a stable `t` function.
 * Usage: const t = useT(); t("nav.studio")
 */
export function useT() {
  const { dict } = useContext(LocaleContext);
  return useMemo(
    () => (key: string, vars?: Record<string, string | number>) =>
      translate(dict, key, vars),
    [dict],
  );
}

/**
 * Server/loader-safe translate (no React context).
 * Use inside `head()` callbacks where we don't have access to the hook.
 */
export function tFor(locale: Locale, key: string, vars?: Record<string, string | number>) {
  return translate(getDictionary(locale), key, vars);
}
