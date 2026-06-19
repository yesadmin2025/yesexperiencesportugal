// Studio V3 — Timeline view for the Living Journey drawer.
//
// Renders the resolved Signature's route as an ordered, numbered timeline.
// Pulls strictly from `resolveStudioV3Route` route points — no invented
// stops, no fabricated hour bands. Each entry shows the real stop label
// and the editorial line that lives on that Signature's own stop.
//
// Used inside the "Timeline" tab of `LivingJourneyPanel`'s drawer.

export interface TimelineMoment {
  label: string;
  story?: string | null;
}

export interface TimelineViewProps {
  moments: TimelineMoment[];
  /** Optional duration label from the resolved Signature (e.g. "7–9h"). */
  durationLabel?: string | null;
  /** Origin label (e.g. "Lisbon hotel") so the timeline frames the day. */
  originLabel?: string | null;
}

export function TimelineView({ moments, durationLabel, originLabel }: TimelineViewProps) {
  if (moments.length === 0) {
    return (
      <p
        className="mt-3 text-[12.5px] italic"
        style={{
          fontFamily: "var(--font-serif)",
          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        }}
      >
        Your timeline appears once the shape of the day is set.
      </p>
    );
  }

  return (
    <div data-testid="studio-v3-timeline-view" className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
          style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
        >
          The shape of the day
        </p>
        {durationLabel ? (
          <span
            className="text-[10px] uppercase tracking-[0.2em] font-semibold tabular-nums"
            style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
          >
            {durationLabel}
          </span>
        ) : null}
      </div>

      <ol className="mt-2 relative pl-5">
        {/* Vertical thread */}
        <span
          aria-hidden
          className="absolute left-[7px] top-1 bottom-1 w-px"
          style={{ background: "color-mix(in oklab, var(--gold) 35%, transparent)" }}
        />
        {originLabel ? (
          <li className="relative pb-3">
            <span
              aria-hidden
              className="absolute -left-5 top-[5px] grid h-3.5 w-3.5 place-items-center rounded-full"
              style={{
                background: "var(--ivory)",
                border: "1.5px solid color-mix(in oklab, var(--gold) 70%, transparent)",
              }}
            />
            <p
              className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              Begin
            </p>
            <p
              className="text-[12px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              {originLabel}
            </p>
          </li>
        ) : null}
        {moments.map((m, i) => (
          <li key={`${m.label}-${i}`} className="relative pb-3 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-5 top-[5px] grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] font-bold tabular-nums"
              style={{
                background: "var(--gold)",
                color: "var(--ivory)",
              }}
            >
              {i + 1}
            </span>
            <p
              className="text-[12px] font-semibold leading-snug"
              style={{ color: "var(--charcoal)" }}
            >
              {m.label}
            </p>
            {m.story ? (
              <p
                className="mt-0.5 text-[11.5px] leading-snug"
                style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
              >
                {m.story}
              </p>
            ) : null}
          </li>
        ))}
        {originLabel ? (
          <li className="relative">
            <span
              aria-hidden
              className="absolute -left-5 top-[5px] grid h-3.5 w-3.5 place-items-center rounded-full"
              style={{
                background: "color-mix(in oklab, var(--gold) 70%, transparent)",
                border: "1.5px solid var(--gold)",
              }}
            />
            <p
              className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              Return
            </p>
            <p
              className="text-[12px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              {originLabel}
            </p>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
