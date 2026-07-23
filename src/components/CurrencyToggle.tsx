/**
 * Currency chip (EUR · USD). Mirrors the LanguageSwitcher visual so the
 * two live together as a single "traveller preferences" cluster.
 */

import * as React from "react";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics-events";

interface Props {
  variant?: "header" | "footer";
  className?: string;
}

export function CurrencyToggle({ variant = "header", className }: Props) {
  const { currency, setCurrency, supported } = useCurrency();

  return (
    <nav
      aria-label="Currency"
      className={cn(
        "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]",
        variant === "footer" && "gap-3 text-[12px]",
        className,
      )}
    >
      {supported.map((c, i) => {
        const active = c === currency;
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
              }}
              aria-pressed={active}
              className={cn(
                "tap transition-colors duration-200 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]",
                variant === "footer" &&
                  "focus-visible:ring-offset-[color:var(--charcoal)]",
                active
                  ? variant === "footer"
                    ? "text-[color:var(--gold-soft)] font-medium"
                    : "text-[color:var(--teal)] font-medium"
                  : variant === "footer"
                    ? "text-[color:var(--ivory)]/75 hover:text-[color:var(--gold-soft)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]",
              )}
            >
              {c}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
