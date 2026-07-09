/**
 * ReviewSourceLink — per-review source link primitive.
 *
 * Renders the source badge (Tripadvisor icon or platform label pill) as an
 * accessible, obviously-interactive link to the ORIGINAL review. Shared
 * between the homepage `GuestQuotes` carousel and per-tour `TourReviews`
 * grid so both surfaces stay consistent.
 *
 * Design guarantees (see .lovable/plan.md — Review Source Icon plan):
 * - 44×44 tap area via padding (visual size unchanged)
 * - visible hover + focus-visible affordance (gold border, subtle lift)
 * - swipe-safe click: cancels navigation if the pointer moved >8px between
 *   pointerdown/pointerup (protects horizontal carousel swipes)
 * - external-link arrow glyph — always visible on touch, hover-only on desktop
 * - descriptive aria-label including reviewer name + "opens in new tab"
 * - respects prefers-reduced-motion (no scale, only color transitions)
 * - if no source URL, renders a non-interactive span (no dead links)
 */
import { useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";

const SOURCE_LABEL: Record<string, string> = {
  tripadvisor: "Tripadvisor",
  google: "Google",
  viator: "Viator",
  getyourguide: "GetYourGuide",
  airbnb: "Airbnb",
  booking: "Booking.com",
};

interface Props {
  source: string;
  sourceUrl?: string | null;
  reviewerName?: string | null;
  /** Visually dim when not the active/snapped card in a carousel. */
  dim?: boolean;
}

export function ReviewSourceLink({ source, sourceUrl, reviewerName, dim = false }: Props) {
  const label = SOURCE_LABEL[source] ?? source;
  const downPoint = useRef<{ x: number; y: number } | null>(null);

  const badge =
    source === "tripadvisor" ? (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] transition-[background-color,border-color,transform] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:border-[color:var(--gold)] group-hover:bg-white group-focus-visible:border-[color:var(--gold)] motion-safe:group-hover:scale-[1.03] motion-safe:group-active:scale-[.97]">
        <PlatformBadge platform="tripadvisor" className="h-4 w-auto" />
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--charcoal)]/75 transition-[background-color,border-color,color,transform] duration-[180ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:border-[color:var(--gold)] group-hover:text-[color:var(--charcoal)] group-hover:bg-white group-focus-visible:border-[color:var(--gold)] motion-safe:group-hover:scale-[1.03] motion-safe:group-active:scale-[.97]">
        {label}
      </span>
    );

  // External-link glyph: always visible on touch (no hover), hover/focus-only
  // on desktop. `md:` gates the desktop-only reveal.
  const arrow = (
    <ArrowUpRight
      size={11}
      strokeWidth={1.75}
      aria-hidden="true"
      className="text-[color:var(--gold)] transition-[opacity,transform] duration-[180ms] ease-out opacity-70 md:opacity-0 md:-translate-x-0.5 group-hover:opacity-90 group-hover:translate-x-0 group-focus-visible:opacity-90 group-focus-visible:translate-x-0"
    />
  );

  const wrapperClass = [
    "group shrink-0 inline-flex items-center gap-1 p-2 -m-2 rounded-full",
    "min-h-11 min-w-11 justify-center",
    "outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "transition-opacity duration-200",
    dim ? "opacity-70" : "opacity-100",
  ].join(" ");

  if (!sourceUrl) {
    return (
      <span className={wrapperClass} aria-label={`Review from ${label}`}>
        {badge}
      </span>
    );
  }

  const ariaLabel = reviewerName
    ? `View ${reviewerName}'s original review on ${label} (opens in new tab)`
    : `View this review on ${label} (opens in new tab)`;

  const onPointerDown = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    downPoint.current = { x: e.clientX, y: e.clientY };
  };

  const onClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    const start = downPoint.current;
    downPoint.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 8) {
      // Treat as a swipe, not a tap — do not navigate.
      e.preventDefault();
    }
  };

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      title={`View original on ${label}`}
      className={`${wrapperClass} cursor-pointer`}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {badge}
      {arrow}
    </a>
  );
}

export default ReviewSourceLink;
