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
import { trackEvent } from "@/lib/analytics-events";

const LOCALE_STORAGE_KEY = "yes.locale.v1";

function persistLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode / disabled */
  }
}

interface LanguageSwitcherProps {
  variant?: "header" | "footer";
  className?: string;
}

const FULL_LOCALE_KEY: Record<Locale, string> = {
  en: "lang.english",
  pt: "lang.portuguese",
};

export function LanguageSwitcher({ variant = "header", className }: LanguageSwitcherProps) {
  const active = useLocale();
  const t = useT();
  const location = useRouterState({ select: (s) => s.location });

  const { path: localeNeutralPath } = parseLocaleFromPath(location.pathname);
  const search = location.searchStr ?? "";
  const hash = location.hash ? `#${location.hash}` : "";
  const ptReady = isPtReady(localeNeutralPath);

  return (
    <div
      role="group"
      aria-label={t("lang.switcher_label")}
      data-a11y-scope="language-switcher"
      data-variant={variant}
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
        const fullName = t(FULL_LOCALE_KEY[loc]);
        const sep = i > 0 && (
          <span aria-hidden className="text-[color:var(--charcoal-soft)] opacity-40">
            ·
          </span>
        );

        if (isDisabled) {
          return (
            <span key={loc} className="inline-flex items-center gap-2">
              {sep}
              <button
                type="button"
                disabled
                aria-disabled="true"
                aria-label={`${fullName} — ${t("lang.pt_coming_soon")}`}
                title={t("lang.pt_coming_soon")}
                data-locale-option={loc}
                className={cn(
                  "tap min-h-[32px] min-w-[32px] px-1 cursor-not-allowed rounded-sm text-[color:var(--charcoal-soft)] opacity-40",
                  variant === "footer" && "text-[color:var(--ivory)]/60",
                )}
              >
                <span aria-hidden>{label}</span>
              </button>
            </span>
          );
        }

        return (
          <span key={loc} className="inline-flex items-center gap-2">
            {sep}
            <Link
              to={`${target}${search}${hash}` as string}
              onClick={() => {
                persistLocale(loc);
                if (loc !== active) {
                  trackEvent("language_changed", { from: active, to: loc });
                }
              }}
              aria-current={isActive ? "true" : undefined}
              aria-label={fullName}
              hrefLang={loc}
              data-locale-option={loc}
              className={cn(
                "tap min-h-[32px] min-w-[32px] px-1 inline-flex items-center justify-center rounded-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]",
                variant === "footer" && "focus-visible:ring-offset-[color:var(--charcoal)]",
                isActive
                  ? variant === "footer"
                    ? "text-[color:var(--gold-soft)] font-medium"
                    : "text-[color:var(--teal)] font-medium"
                  : variant === "footer"
                    ? "text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              )}
            >
              <span aria-hidden>{label}</span>
            </Link>
          </span>
        );
      })}
    </div>
  );
}
