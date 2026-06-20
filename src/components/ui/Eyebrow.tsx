import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Eyebrow — the single, canonical implementation of the small uppercase
 * label that introduces every section across the site.
 *
 * Visual contract (locked by .he-eyebrow-bar in src/styles.css):
 *   • 32×1.5px gold-deep leading rule
 *   • optional trailing rule when `flank` is true (centred titles, FAQ-style)
 *   • Inter 11px / 700 / tracking 0.28em / uppercase, --charcoal label
 *   • 14px gap between rule, optional icon and label
 *   • inline svg icon auto-renders at 12px in --gold-deep
 *
 * Always use this component instead of writing ad-hoc <span className="eyebrow">
 * or className="he-eyebrow-bar" markup. That way icon, spacing and colour stay
 * identical on every page.
 */
export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Optional Lucide / inline SVG icon to render between the rule and label. */
  icon?: React.ReactNode;
  /** Render a trailing rule on the right (centred / flanked titles). */
  flank?: boolean;
  /** Render a small green "live" dot before the label (Studio rail only). */
  live?: boolean;
  /**
   * Visual tone. Defaults to "onLight" (charcoal label on ivory/sand).
   * Use "onDark" when the eyebrow sits over a dark image / hero overlay
   * — the label switches to gold-soft for legibility while spacing,
   * size and tracking stay identical.
   */
  tone?: "onLight" | "onDark";
  children: React.ReactNode;
}

export const Eyebrow = React.forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ icon, flank, live, tone = "onLight", className, children, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "he-eyebrow-bar",
          flank && "flank",
          tone === "onDark" && "he-eyebrow-bar--dark",
          className,
        )}
        {...rest}
      >
        {live ? <span className="live-dot" aria-hidden="true" /> : null}
        {icon}
        {children}
      </span>
    );
  },
);
Eyebrow.displayName = "Eyebrow";

export default Eyebrow;
