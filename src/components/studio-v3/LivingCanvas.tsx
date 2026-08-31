/**
 * TURBO 1 — LIVING CANVAS (visible layer).
 *
 * Renders the derived `LivingCanvasModel`. It holds no state of its own and
 * decides nothing: threads, geography and moments all arrive already derived.
 *
 * Mobile (393×852): a vertical story — the atmosphere first, the consequence
 * of the last decision immediately under it. No two-column squeeze, nothing
 * sticky over the decision.
 * Desktop: the same story, wider and progressively canvas-dominant.
 */

import { useEffect, useRef, useState } from "react";
import type { LivingCanvasModel } from "@/lib/studio-v3/livingCanvasModel";
import type { StudioMedia } from "@/lib/studio-v3/studioMediaResolver";

const STATUS_STYLE: Record<string, { opacity: number; line: string }> = {
  active: { opacity: 1, line: "var(--gold)" },
  supporting: { opacity: 0.72, line: "color-mix(in oklab, var(--gold) 45%, transparent)" },
  deferred: { opacity: 0.5, line: "color-mix(in oklab, var(--charcoal) 25%, transparent)" },
  excluded: { opacity: 0.32, line: "color-mix(in oklab, var(--charcoal) 18%, transparent)" },
};

export function LivingCanvas({
  model,
  variant = "full",
}: {
  model: LivingCanvasModel;
  /**
   * `assembled` — the shaped continuity ribbon shown on YOUR DAY. Same derived
   * model, same media identities, compressed so it introduces the finished day
   * instead of competing with the existing reveal.
   */
  variant?: "full" | "assembled";
}) {
  const visibleThreads = model.threads.filter((thread) => thread.status !== "excluded");

  if (variant === "assembled") {
    return (
      <section
        data-testid="studio-living-canvas"
        data-variant="assembled"
        data-stage={model.stage}
        data-geography={model.geography.kind}
        aria-label="The pieces you chose, assembled"
        className="w-full"
      >
        <p
          className="text-[10.5px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}
        >
          {model.geography.kind === "none" ? "Assembled" : `${geographyLabel(model)} · assembled`}
        </p>
        {visibleThreads.length > 0 ? (
          <p
            data-testid="studio-canvas-assembled-threads"
            className="mt-2 text-[14px] leading-relaxed"
            style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
          >
            {visibleThreads.map((thread) => thread.label).join(" · ")}
          </p>
        ) : null}
        {assembledRail(model).length > 0 ? (
          <ul
            data-testid="studio-canvas-assembled-rail"
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
          >
            {assembledRail(model).map((moment) => (
              <li key={moment.id} data-moment-id={moment.id} className="shrink-0">
                <CrossfadeImage
                  media={moment.image}
                  className="h-[56px] w-[76px] rounded-[3px] overflow-hidden"
                />
              </li>
            ))}
          </ul>
        ) : null}

      </section>
    );
  }

  return (
    <section
      data-testid="studio-living-canvas"
      data-stage={model.stage}
      data-geography={model.geography.kind}
      aria-label="What the day is becoming"
      className="mt-8 w-full"
    >
      <figure className="relative overflow-hidden rounded-[4px]">
        <CrossfadeImage
          media={model.backdrop}
          className="w-full h-[212px] md:h-[320px]"
        />
        {model.stage !== "mood" ? (
          <figcaption
            className="absolute left-0 bottom-0 right-0 px-4 py-3 text-[10.5px] uppercase tracking-[0.22em] font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--ivory)",
              background:
                "linear-gradient(to top, color-mix(in oklab, var(--charcoal) 72%, transparent), transparent)",
            }}
          >
            {model.geography.kind === "none" ? "Taking shape" : geographyLabel(model)}
          </figcaption>
        ) : null}
      </figure>

      {visibleThreads.length > 0 && !model.showsRealMoments ? (
        <ul data-testid="studio-canvas-threads" className="mt-4 flex flex-col gap-2">
          {visibleThreads.map((thread) => {
            const style = STATUS_STYLE[thread.status] ?? STATUS_STYLE.supporting;
            return (
              <li
                key={thread.id}
                data-thread-id={thread.id}
                data-thread-status={thread.status}
                className="flex items-center gap-3 motion-safe:transition-opacity motion-safe:duration-[420ms]"
                style={{ opacity: style.opacity }}
              >
                <span aria-hidden className="h-px w-6" style={{ background: style.line }} />
                <span
                  className="text-[14px]"
                  style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
                >
                  {thread.label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {model.showsRealMoments ? (
        <ol data-testid="studio-canvas-moments" className="mt-4 flex flex-col gap-3">
          {model.moments.map((moment) => (
            <li key={moment.id} data-moment-id={moment.id} className="flex items-start gap-3">
              <CrossfadeImage
                media={moment.image}
                className="h-[64px] w-[84px] shrink-0 rounded-[3px] overflow-hidden"
              />
              <div className="flex min-w-0 flex-col gap-1">
              <span
                className="text-[15px]"
                style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
              >
                {moment.label}
              </span>
              <span
                className="text-[13px] leading-relaxed"
                style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
              >
                {moment.story}
              </span>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/**
 * Soft image crossfade — never an abrupt switch. The outgoing frame stays
 * underneath until the incoming one has decoded, then fades away.
 */
function CrossfadeImage({ media, className }: { media: StudioMedia; className?: string }) {
  const [shown, setShown] = useState<StudioMedia>(media);
  const [previous, setPrevious] = useState<StudioMedia | null>(null);
  const last = useRef(media.id);

  useEffect(() => {
    if (media.id === last.current) return;
    setPrevious(shown);
    setShown(media);
    last.current = media.id;
    const t = window.setTimeout(() => setPrevious(null), 620);
    return () => window.clearTimeout(t);
  }, [media, shown]);

  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      {previous ? (
        <img
          aria-hidden
          src={previous.src}
          alt=""
          data-media-focal={previous.focal ?? undefined}
          // Each crossfade layer keeps ITS OWN verified focal point.
          style={previous.focal ? { objectPosition: previous.focal } : undefined}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <img
        key={shown.id}
        src={shown.src}
        alt={shown.alt}
        loading="lazy"
        decoding="async"
        data-media-id={shown.id}
        data-media-source={shown.source}
        data-media-focal={shown.focal ?? undefined}
        // Absent focal = natural CSS centre. Never an invented crop.
        style={shown.focal ? { objectPosition: shown.focal } : undefined}
        className="relative h-full w-full object-cover motion-safe:animate-[studioCanvasFade_560ms_ease-out_both]"
      />
      <style>{`@keyframes studioCanvasFade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </span>
  );
}


function geographyLabel(model: LivingCanvasModel): string {
  switch (model.geography.kind) {
    case "region-cue":
      return model.geography.regionLabel;
    case "anchors":
      return model.geography.regionLabel;
    case "route":
      return `${model.geography.regionLabel} · route forming`;
    case "timeline":
      return `${model.geography.regionLabel} · the day in order`;
    default:
      return "Taking shape";
  }
}

/**
 * The assembled rail shows the DISTINCT frames the day is made of. Two moments
 * that legitimately resolve to the same real image (a shared regional frame)
 * must not print the same thumbnail twice — that reads as a rendering bug, not
 * as continuity. Order and identity are preserved; only repeats are dropped.
 */
function assembledRail(model: LivingCanvasModel) {
  const seen = new Set<string>();
  return model.moments.filter((moment) => {
    if (seen.has(moment.image.id)) return false;
    seen.add(moment.image.id);
    return true;
  });
}
