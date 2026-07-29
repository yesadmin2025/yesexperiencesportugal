"use client";

import { Link } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MouseEvent, ReactNode } from "react";

interface AccessibleIconLinkProps {
  /** Accessible name for the link (read by screen readers). */
  label: string;
  /** Visible tooltip text. Defaults to `label`. */
  tooltip?: string;
  children: ReactNode;
  className?: string;
  /** Internal TanStack route. Use either `to` or `href`. */
  to?: string;
  /** Route params when `to` contains dynamic segments. */
  params?: Record<string, string>;
  /** External URL. Use either `to` or `href`. */
  href?: string;
  /** Whether the external link opens in a new tab. */
  external?: boolean;
  /** Optional click handler (e.g. close a mobile menu). */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Icon-only link with an accessible name and a visible tooltip.
 *
 * Combines `aria-label` on the interactive element with a Radix tooltip
 * so the destination is announced to assistive tech and visible on hover
 * / focus for sighted desktop users.
 */
export function AccessibleIconLink({
  label,
  tooltip,
  children,
  className,
  to,
  params,
  href,
  external,
  onClick,
}: AccessibleIconLinkProps) {
  const content = tooltip || label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Link
            to={to}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous shape; narrowing here buys no safety
            params={params as any}
            aria-label={label}
            className={className}
            onClick={onClick}
          >
            {children}
          </Link>
        ) : (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            aria-label={label}
            className={className}
            onClick={onClick}
          >
            {children}
          </a>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{content}</TooltipContent>
    </Tooltip>
  );
}
