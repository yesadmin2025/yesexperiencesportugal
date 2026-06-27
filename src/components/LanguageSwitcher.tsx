/**
 * Discreet language switcher (EN · ES · PT).
 *
 * Reads the current path, strips any existing locale prefix, and
 * builds sibling URLs for each supported locale. Preserves search
 * params and hash so Studio reveal tokens etc. survive a switch.
 *
 * Persists the choice in a cookie so return visits land in the same
 * language. First-visit detection from Accept-Language is INTENTIONALLY
 * disabled — Google penalises auto-redirects on language.
 *
 * Renders nothing visual when locale infra is not yet wired into the
 * router (A2). Until then the switcher is mounted but harmless.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  localePrefix,
  parseLocaleFromPath,
  type Locale,
} from "@/i18n/config";
import { useLocale } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  // 180-day cookie, SameSite=Lax so it survives normal navigation.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
}

interface LanguageSwitcherProps {
  /** "header" tightens spacing for the navbar; "footer" is roomier. */
  variant?: "header" | "footer";
  className?: string;
}

export function LanguageSwitcher({
  variant = "header",
  className,
}: LanguageSwitcherProps) {
  const active = useLocale();
  const location = useRouterState({ select: (s) => s.location });

  const { path: localeNeutralPath } = parseLocaleFromPath(location.pathname);
  const search = location.searchStr ?? "";
  const hash = location.hash ? `#${location.hash}` : "";

  return (
    <nav
      aria-label="Language"
      className={cn(
        "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]",
        variant === "footer" && "gap-3 text-[12px]",
        className,
      )}
    >
      {LOCALES.map((loc, i) => {
        const prefix = localePrefix(loc);
        const target =
          `${prefix}${localeNeutralPath === "/" ? "" : localeNeutralPath}` || "/";
        const isActive = loc === active;
        return (
          <span key={loc} className="inline-flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-[color:var(--charcoal-soft)] opacity-40">
                ·
              </span>
            )}
            <Link
              to={`${target}${search}${hash}` as string}
              onClick={() => setLocaleCookie(loc)}
              aria-current={isActive ? "true" : undefined}
              hrefLang={loc}
              className={cn(
                "transition-colors duration-200",
                isActive
                  ? "text-[color:var(--gold)] font-medium"
                  : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              )}
            >
              {LOCALE_LABELS[loc].short}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
