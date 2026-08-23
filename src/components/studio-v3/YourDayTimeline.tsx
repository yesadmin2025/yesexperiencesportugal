/**
 * YourDayTimeline — the editorial half of the `Your Day` surface.
 *
 * Shown INSTEAD of a map when we do not hold real coordinates for every
 * moment (see `yourDayMapTruth.ts`). It is a deliberate composition, not a
 * degraded state: no silhouette, no blur, no spinner, no "map unavailable"
 * apology. Numbered 01 / 02 / 03 with a hairline spine, using only names,
 * locations and copy that already exist in the catalog.
 */

interface TimelineMoment {
  label: string;
  location?: string | null;
  story?: string | null;
}

interface Props {
  moments: ReadonlyArray<TimelineMoment>;
  /** How many moments are currently revealed (sequenced entrance). */
  activeCount?: number;
  /** Index of the moment currently spotlit by the reel, if any. */
  activeIndex?: number | null;
  className?: string;
}

export function YourDayTimeline({ moments, activeCount, activeIndex = null, className }: Props) {
  const shown = typeof activeCount === "number" ? Math.max(1, activeCount) : moments.length;

  return (
    <ol
      data-testid="studio-v3-your-day-timeline"
      aria-label="Your day, moment by moment"
      className={`relative mx-auto w-full max-w-[520px] pl-8 ${className ?? ""}`}
    >
      {/* Hairline spine — the only ornament. */}
      <span
        aria-hidden
        className="absolute left-[13px] top-2 bottom-2 w-px"
        style={{ background: "color-mix(in oklab, var(--charcoal) 14%, transparent)" }}
      />

      {moments.map((m, i) => {
        const visible = i < shown;
        const isActive = activeIndex === i;
        return (
          <li
            key={`${m.label}-${i}`}
            data-timeline-index={i + 1}
            className="relative pb-6 last:pb-0 motion-reduce:!opacity-100 motion-reduce:!translate-y-0"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 420ms ease-out, transform 420ms ease-out",
            }}
          >
            <span
              aria-hidden
              className="absolute -left-8 top-0 inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
              style={{
                background: isActive
                  ? "var(--gold)"
                  : "color-mix(in oklab, var(--gold) 22%, transparent)",
                color: isActive ? "var(--charcoal)" : "color-mix(in oklab, var(--charcoal) 78%, transparent)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <h3
              className="text-[16px] sm:text-[18px] leading-[1.25] font-semibold [text-wrap:pretty]"
              style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
            >
              {m.label}
            </h3>

            {m.location ? (
              <p
                className="mt-1 text-[10px] uppercase tracking-[0.24em] font-semibold"
                style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
              >
                {m.location}
              </p>
            ) : null}

            {m.story ? (
              <p
                className="mt-2 text-[13px] leading-relaxed [text-wrap:pretty]"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "color-mix(in oklab, var(--charcoal) 74%, transparent)",
                }}
              >
                {m.story}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
