/**
 * Currency chip (EUR · USD). Mirrors the LanguageSwitcher visual so the
 * two live together as a single "traveller preferences" cluster.
 *
 * A11y:
 *   • Uses a labelled `role="group"` with roving `aria-pressed` buttons.
 *   • Each button carries an `aria-label` with the full currency name
 *     and an `aria-describedby` pointing at the shared "checkout in
 *     EUR" helper hosted by `CurrencyProvider`.
 *   • Change is announced through the app-level polite live region
 *     also hosted by `CurrencyProvider`, so multiple chips on the same
 *     page never produce duplicate announcements.
 */

import * as React from "react";
import { useCurrency } from "@/lib/currency";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics-events";

interface Props {
  variant?: "header" | "footer";
  /** Surface tone — used to swap the focus ring offset color. */
  surface?: "light" | "dark";
  className?: string;
}

const FULL_NAME_KEY: Record<string, string> = {
  EUR: "currency.eur",
  USD: "currency.usd",
};

export function CurrencyToggle({ variant = "header", surface = "light", className }: Props) {
  const { currency, setCurrency, supported, announce, describedById } = useCurrency();
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t("currency.switcher_label")}
      data-a11y-scope="currency-toggle"
      data-variant={variant}
      data-surface={surface}
      className={cn(
        "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]",
        variant === "footer" && "gap-3 text-[12px]",
        className,
      )}
    >
      {supported.map((c, i) => {
        const active = c === currency;
        const fullName = t(FULL_NAME_KEY[c] ?? "currency.eur");
        return (
          <span key={c} className="inline-flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-[color:var(--charcoal-soft)] opacity-40">
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (c === currency) return;
                setCurrency(c);
                trackEvent("currency_changed", { from: currency, to: c });
                announce(t("currency.announce_change", { currency: fullName }));
              }}
              aria-pressed={active}
              aria-label={fullName}
              aria-describedby={describedById}
              data-currency-option={c}
              className={cn(
                "tap min-h-[44px] min-w-[44px] px-1 inline-flex items-center justify-center transition-colors duration-200 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2",
                surface === "dark"
                  ? "focus-visible:ring-offset-[color:var(--charcoal)]"
                  : "focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]",
                variant === "footer" && "focus-visible:ring-offset-[color:var(--charcoal)]",
                active
                  ? variant === "footer"
                    ? "text-[color:var(--gold-soft)] font-medium"
                    : "text-[color:var(--teal)] font-medium"
                  : variant === "footer"
                    ? "text-[color:var(--ivory)]/85 hover:text-[color:var(--gold-soft)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              )}
            >
              <span aria-hidden>{c}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}
