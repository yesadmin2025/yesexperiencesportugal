/**
 * Small "Ver em EUR · USD" chip mounted inline on pages that display
 * indicative euro prices. Wraps the shared CurrencyToggle so the widget
 * only exists next to price surfaces (not in the global chrome).
 */

import { CurrencyToggle } from "@/components/CurrencyToggle";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  align?: "start" | "end";
}

export function PriceCurrencyChip({ className, align = "end" }: Props) {
  const t = useT();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]",
        align === "end" && "ml-auto",
        className,
      )}
    >
      <span aria-hidden>{t("currency.view_in") ?? "View in"}</span>
      <CurrencyToggle variant="header" />
    </div>
  );
}
