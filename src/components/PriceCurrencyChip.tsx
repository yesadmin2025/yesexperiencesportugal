/**
 * Small "View in EUR · USD" chip mounted inline on pages that display
 * indicative euro prices. Wraps the shared CurrencyToggle so the widget
 * only exists next to price surfaces (not in the global chrome).
 *
 * A11y: the whole chip is exposed as a labelled group. The visible
 * "View in" prefix is a real (non-aria-hidden) label the toggle group
 * references via `aria-labelledby`, so screen readers announce the
 * chip's purpose before the currency buttons.
 */

import * as React from "react";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  align?: "start" | "end";
  /** Surface tone — swaps the toggle's focus-ring offset color. */
  surface?: "light" | "dark";
}

/**
 * `useId` is SSR-stable — a module-level counter is not, and produced
 * hydration mismatches when several chips render on one page.
 */
function useChipLabelId() {
  return `yes-price-chip-${React.useId()}`;
}

export function PriceCurrencyChip({ className, align = "end", surface = "light" }: Props) {
  const t = useT();
  const labelId = useChipLabelId();
  return (
    <div
      data-a11y-scope="price-currency-chip"
      className={cn(
        "inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]",
        align === "end" && "ml-auto",
        className,
      )}
    >
      <span id={labelId}>{t("currency.view_in") ?? "View in"}</span>
      <span role="group" aria-labelledby={labelId}>
        <CurrencyToggle variant="header" surface={surface} />
      </span>
    </div>
  );
}
