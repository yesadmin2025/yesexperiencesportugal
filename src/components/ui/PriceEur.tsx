/**
 * Inline EUR-denominated price that reacts to the CurrencyProvider.
 *
 * Renders the amount formatted in the active display currency (EUR/USD)
 * while keeping EUR as the source of truth via `data-price-eur`. Used
 * on listing/hero surfaces where prices are indicative — checkout and
 * emails render EUR literally and MUST NOT go through this component.
 */

import * as React from "react";
import { useFormatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Props {
  amountEur: number;
  className?: string;
  /** Optional descriptor for `data-price-role` (e.g. "from", "total"). */
  role?: string;
}

export function PriceEur({ amountEur, className, role }: Props) {
  const format = useFormatPrice();
  return (
    <span className={cn(className)} data-price-eur={amountEur} data-price-role={role ?? "amount"}>
      {format(amountEur)}
    </span>
  );
}
