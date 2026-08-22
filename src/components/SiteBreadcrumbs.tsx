import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Crumb } from "@/lib/jsonld";

/**
 * Visible breadcrumb trail — the on-page counterpart of the
 * `breadcrumbLd()` JSON-LD already emitted by each leaf route.
 *
 * Pass the SAME crumb array to both so the rendered trail and the
 * structured data can never drift. The last crumb is the current page
 * and is rendered as plain text with `aria-current="page"`.
 *
 * Brand rules: Inter, sentence case, charcoal-soft on ivory, gold
 * chevrons as micro-detail only. No new colors, no new fonts.
 */
export function SiteBreadcrumbs({
  crumbs,
  className,
  containerClassName = "container-x",
}: {
  crumbs: Crumb[];
  className?: string;
  /** Set to "" when the parent already provides horizontal padding. */
  containerClassName?: string;
}) {
  if (crumbs.length < 2) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("bg-[color:var(--ivory)] pt-4 pb-1 sm:pt-6", className)}
    >
      <ol
        className={cn(
          "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] leading-5 text-[color:var(--charcoal-soft)] sm:text-[13px]",
          containerClassName,
        )}
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${c.path}-${i}`} className="inline-flex items-center gap-x-1.5">
              {i > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-[color:var(--gold)]"
                />
              )}
              {isLast ? (
                <span aria-current="page" className="text-[color:var(--charcoal)]">
                  {c.name}
                </span>
              ) : (
                <Link
                  to={c.path}
                  className="rounded-sm underline-offset-4 transition-colors hover:text-[color:var(--teal)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--teal)]"
                >
                  {c.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default SiteBreadcrumbs;
