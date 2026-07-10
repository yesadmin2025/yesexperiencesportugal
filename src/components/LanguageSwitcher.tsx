/**
 * Discreet language switcher (EN · PT).
 *
 * Phase 3: only surfaces PT for routes with published Portuguese copy
 * (see `src/i18n/pt-ready.ts`). Unready paths show PT muted with a
 * "coming soon" tooltip so Google never sees a broken PT alternate.
 *
 * Persists the choice in a cookie so return visits land in the same
 * language. First-visit detection from Accept-Language is INTENTIONALLY
 * disabled — Google penalises auto-redirects on language.
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
import { useLocale, useT } from "@/i18n/locale-context";
import { isPtReady } from "@/i18n/pt-ready";
import { cn } from "@/lib/utils";

function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
}

interface LanguageSwitcherProps {
  variant?: "header" | "footer";
  className?: string;
}

export function LanguageSwitcher({ variant = "header", className }: LanguageSwitcherProps) {
  const active = useLocale();
  const t = useT();
  const location = useRouterState({ select: (s) => s.location });

  const { path: localeNeutralPath } = parseLocaleFromPath(location.pathname);
  const search = location.searchStr ?? "";
  const hash = location.hash ? `#${location.hash}` : "";
  const ptReady = isPtReady(localeNeutralPath);

  return (
    <nav
      aria-label={t("lang.switcher_label")}
      className={cn(
        "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]",
        variant === "footer" && "gap-3 text-[12px]",
        className,
      )}
    >
      {LOCALES.map((loc, i) => {
        const prefix = localePrefix(loc);
        const target = `${prefix}${localeNeutralPath === "/" ? "" : localeNeutralPath}` || "/";
        const isActive = loc === active;
        const isDisabled = loc === "pt" && !ptReady && active !== "pt";

        const label = LOCALE_LABELS[loc].short;
        const sep = i > 0 && (
          <span aria-hidden className="text-[color:var(--charcoal-soft)] opacity-40">
            ·
          </span>
        );

        if (isDisabled) {
          return (
            <span key={loc} className="inline-flex items-center gap-2">
              {sep}
              <span
                title={t("lang.pt_coming_soon")}
                aria-disabled="true"
                className="cursor-not-allowed text-[color:var(--charcoal-soft)] opacity-40"
              >
                {label}
              </span>
            </span>
          );
        }

        return (
          <span key={loc} className="inline-flex items-center gap-2">
            {sep}
            <Link
              to={`${target}${search}${hash}` as string}
              onClick={() => setLocaleCookie(loc)}
              aria-current={isActive ? "true" : undefined}
              hrefLang={loc}
              className={cn(
                "transition-colors duration-200",
                isActive
                  ? "text-[color:var(--teal)] font-medium"
                  : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              )}
            >
              {label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
