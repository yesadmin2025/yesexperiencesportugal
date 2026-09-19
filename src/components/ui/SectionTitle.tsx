import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionTitle — the single H2 (or H1, optionally) used by every section
 * across the site, so mt / leading / tracking / weight stay harmonised
 * and no section invents its own scale.
 *
 * Variants follow the final Newsreader editorial scale.
 *
 * Newsreader italic emphasis: pass JSX inside `children` and wrap the emphasised words
 * with the helper <SectionTitle.Em>...</SectionTitle.Em> — that renders
 * `italic font-normal text-[color:var(--teal)]`, the locked emphasis token.
 */

const baseClasses = "editorial-title section-title editorial-title-safe font-editorial text-[color:var(--charcoal)] font-normal";

const sizeClasses = {
  default:
    "text-[2.5rem] md:text-[3.5rem] leading-[1.06] md:leading-[1.03] tracking-[-0.012em] text-balance",
  anchor:
    "text-[clamp(2.55rem,10vw,3rem)] md:text-[clamp(3.25rem,5vw,4.5rem)] leading-[1.04] md:leading-[1.02] tracking-[-0.015em] md:tracking-[-0.018em] text-balance",
  compact:
    "text-[1.9rem] md:text-[2.075rem] leading-[1.08] tracking-[-0.008em] text-balance",
} as const;

export type SectionTitleSize = keyof typeof sizeClasses;

export interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
  size?: SectionTitleSize;
  /** Margin-top spacing relative to the eyebrow. Defaults to mt-3. */
  spacing?: "tight" | "normal" | "loose";
  children: React.ReactNode;
}

const spacingClasses = {
  tight: "mt-2",
  normal: "mt-3",
  loose: "mt-4",
} as const;

function SectionTitleRoot({
  as: Tag = "h2",
  size = "default",
  spacing = "normal",
  className,
  children,
  ...rest
}: SectionTitleProps) {
  return (
    <Tag
      className={cn(baseClasses, sizeClasses[size], spacingClasses[spacing], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function Em({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <em className={cn("font-editorial italic font-normal text-[color:var(--teal)]", className)} {...rest}>
      {children}
    </em>
  );
}

export const SectionTitle = Object.assign(SectionTitleRoot, { Em });

export default SectionTitle;
