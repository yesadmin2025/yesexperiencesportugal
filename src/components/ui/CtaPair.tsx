import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CtaPair — thin wrapper that renders 2+ adjacent CTAs (typically
 * <CtaButton />) with an aria-hidden textual separator between them.
 *
 * Why: two <a>/<button> elements rendered side-by-side produce HTML
 * like `<a>Reserve this day</a><a>Tailor this Signature</a>` with no
 * whitespace between them. SEO/AI snippet extractors and some screen
 * readers flatten that to `Reserve this dayTailor this Signature`.
 * Inserting an `aria-hidden` " · " between children guarantees a
 * separator in the serialized DOM without adding anything a screen
 * reader will announce (each CTA already has its own label).
 *
 * Visual layout is left to the caller via `className` — CtaPair only
 * adds `inline-flex flex-wrap` defaults that can be overridden.
 */
export interface CtaPairProps {
  children: React.ReactNode;
  className?: string;
  /** Visual layout — defaults to responsive column-then-row. */
  layout?: "stack-then-row" | "row" | "column";
  /** Justify content on the horizontal axis. Defaults to center. */
  justify?: "start" | "center" | "end";
  /** Custom separator string. Defaults to " · " (middle dot). */
  separator?: string;
  as?: keyof React.JSX.IntrinsicElements;
  role?: string;
  "aria-label"?: string;
}

const layoutClasses: Record<NonNullable<CtaPairProps["layout"]>, string> = {
  "stack-then-row": "flex flex-col sm:flex-row",
  row: "flex flex-row",
  column: "flex flex-col",
};

const justifyClasses: Record<NonNullable<CtaPairProps["justify"]>, string> = {
  start: "justify-start items-stretch sm:items-start",
  center: "justify-center items-stretch sm:items-center",
  end: "justify-end items-stretch sm:items-end",
};

export function CtaPair({
  children,
  className,
  layout = "stack-then-row",
  justify = "center",
  separator = " · ",
  as = "div",
  role,
  "aria-label": ariaLabel,
}: CtaPairProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  const Tag = as as React.ElementType;

  return (
    <Tag
      className={cn(
        layoutClasses[layout],
        justifyClasses[justify],
        "min-w-0 max-w-full gap-y-4 gap-x-4 [&>*:not(.sr-only)]:min-w-0 [&>*:not(.sr-only)]:max-w-full",
        className,
      )}
      role={role}
      aria-label={ariaLabel}
    >
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < items.length - 1 ? (
            <span aria-hidden="true" className="sr-only">
              {separator}
            </span>
          ) : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

export default CtaPair;
