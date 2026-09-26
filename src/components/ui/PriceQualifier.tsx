import { PRICE_GROUP_QUALIFIER } from "@/lib/price-copy";
import { cn } from "@/lib/utils";

/**
 * PriceQualifier — the group-size caveat that accompanies every
 * "From €X per person" anchor, rendered as quiet fine print so the
 * price itself stays the visual anchor. Size is fixed (not em-relative)
 * so it stays subordinate even inside large bold price headlines;
 * case/tracking/color are inherited from the surrounding label.
 */
export function PriceQualifier({ className }: { className?: string }) {
  return (
    <span className={cn("text-[11px] font-normal", className)}>
      {PRICE_GROUP_QUALIFIER}
    </span>
  );
}

export default PriceQualifier;
