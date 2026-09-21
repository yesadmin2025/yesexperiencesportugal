import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionTitle — the single H2 (or H1, optionally) used by every section
 * across the site, so mt / leading / tracking / weight stay harmonised
 * and no section invents its own scale.
 *
 * Variants follow the canonical ramp consolidated in the home page:
 *   • "default" — 28px mobile / 36px desktop (most sections)
 *   • "anchor"  — 40px mobile / 60px desktop (page anchors)
 *   • "compact" — 24px mobile / 30px desktop (dense / trust sections)
 *
 * Italic emphasis: pass JSX inside `children` and wrap the emphasised words
 * with the helper <SectionTitle.Em>...</SectionTitle.Em> — that renders
 * `italic font-normal text-[color:var(--teal)]`, the locked emphasis token.
 */

const baseClasses = "editorial-title-safe font-serif text-[color:var(--charcoal)] font-medium tracking-normal";

const sizeClasses = {
  default:
    "text-[1.8125rem] md:text-[2.25rem] leading-[1.18] md:leading-[1.1] text-balance",
  anchor:
    "text-[2.5rem] md:text-[3.75rem] leading-[1.08] md:leading-[1.02] text-balance",
  compact:
    "text-[1.5rem] md:text-[1.875rem] leading-[1.2] md:leading-[1.12] text-balance",
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
    <span className={cn("italic font-normal text-[color:var(--teal)]", className)} {...rest}>
      {children}
    </span>
  );
}

export const SectionTitle = Object.assign(SectionTitleRoot, { Em });

export default SectionTitle;
