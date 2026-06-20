import { ArrowDown, ArrowUp, Clock, Leaf, MessageCircle, Plus, X, Zap } from "lucide-react";
import { fmtMinutes, type Pace, type RouteUI, type RoutedStopUI, builderWaHref } from "./types";
import { BuilderImage } from "./BuilderImage";
import { StopListSkeleton } from "./Skeletons";
import { ElementsShelf } from "./ElementsShelf";
import type { ElementKey } from "./elements";

interface StopImageRef {
  url: string;
  alt: string;
}

interface Props {
  route: RouteUI | null;
  stops: RoutedStopUI[];
  pace: Pace;
  excluded: string[];
  narrative: string;
  narrativeLoading: boolean;
  onPaceChange: (p: Pace) => void;
  onRemoveStop: (key: string) => void;
  onAddBackStop: (key: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  /** Stops the engine excluded — surfaced so the user can re-add. */
  removablePool?: { key: string; label: string }[];
  /** Real image per stop (from experience_images), keyed by stop.key. */
  stopImages?: Record<string, StopImageRef | null>;
  /** One contextual image for the Story section (mood + region match). */
  storyImage?: StopImageRef | null;
  /** True while the engine is reshaping the route — show skeleton placeholders. */
  routeLoading?: boolean;
  /** True while real images for stops are still being fetched from the DB. */
  imagesLoading?: boolean;
  /** Bounded "Add to your day" element selection. */
  selectedElements?: ElementKey[];
  onToggleElement?: (key: ElementKey) => void;
}

const PACE_META: Record<Pace, { label: string; sub: string; icon: typeof Leaf }> = {
  relaxed: { label: "Relaxed", sub: "Fewer stops, more breath", icon: Leaf },
  balanced: { label: "Balanced", sub: "Just right", icon: Clock },
  full: { label: "Full", sub: "More to see", icon: Zap },
};

export function JourneyPanel({
  route,
  stops,
  pace,
  excluded,
  narrative,
  narrativeLoading,
  onPaceChange,
  onRemoveStop,
  onAddBackStop,
  onMove,
  removablePool,
  stopImages,
  storyImage,
  routeLoading = false,
  imagesLoading = false,
  selectedElements,
  onToggleElement,
}: Props) {
  if (!route) return null;
  const totalMin = route.totals.experienceMinutes;
  const driveMin = route.totals.drivingMinutes;
  const stopMin = route.totals.stopMinutes;

  const journeyTitle =
    stops.length >= 2 ? `${stops[0].label} → ${stops[stops.length - 1].label}` : route.region.label;

  return (
    <div className="flex h-full flex-col gap-5 p-5 md:p-6">
      {/* Header */}
      <header>
        <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
          Your journey
        </span>
        <h3 className="serif mt-2 text-[1.5rem] md:text-[1.8rem] leading-[1.1] font-semibold text-[color:var(--charcoal)]">
          {journeyTitle}
        </h3>
        <p className="mt-1 text-[12.5px] text-[color:var(--charcoal)]/60">
          {route.region.label} · {fmtMinutes(totalMin)} total · {fmtMinutes(driveMin)} drive ·{" "}
          {fmtMinutes(stopMin)} on the ground
        </p>
      </header>

      {/* Story */}
      <section className="overflow-hidden rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[color:var(--sand)]/40">
        {storyImage ? (
          <BuilderImage
            src={storyImage.url}
            alt={storyImage.alt}
            ratio="16/9"
            overlay
            rounded={false}
          />
        ) : imagesLoading || routeLoading ? (
          <div
            role="status"
            aria-label="Loading story image"
            className="aspect-[16/9] w-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sand)_85%,transparent)_0%,color-mix(in_oklab,var(--charcoal)_15%,transparent)_100%)] animate-pulse"
          />
        ) : null}
        <div className="p-4">
          <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            Story
          </span>
          <p
            className={[
              "mt-2 serif italic leading-[1.5] text-[15px] text-[color:var(--charcoal)]/85 transition-opacity duration-300",
              narrativeLoading ? "opacity-50" : "opacity-100",
            ].join(" ")}
          >
            {narrative ||
              "A real, achievable day in Portugal — shaped from your choices, ready to adjust."}
          </p>
        </div>
      </section>

      {/* Stops list */}
      <section>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            Selected moments
          </span>
          <span className="text-[11px] text-[color:var(--charcoal)]/50 tabular-nums">
            {routeLoading && stops.length === 0
              ? "shaping…"
              : `${stops.length} stop${stops.length === 1 ? "" : "s"}`}
          </span>
        </div>
        {routeLoading && stops.length === 0 ? (
          <div className="mt-3">
            <StopListSkeleton count={4} />
          </div>
        ) : null}
        <ol className="mt-3 flex flex-col gap-2">
          {stops.map((s, i) => {
            const stopImageEntry = stopImages?.[s.key];
            const stopImageStillLoading = imagesLoading && stopImages && !(s.key in stopImages);
            return (
              <li
                key={s.key}
                className="group flex items-start gap-3 rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-3 transition-colors hover:border-[color:var(--charcoal)]/25"
              >
                {stopImageEntry ? (
                  <BuilderImage
                    src={stopImageEntry.url}
                    alt={stopImageEntry.alt}
                    ratio="1/1"
                    className="h-14 w-14 shrink-0"
                  >
                    <span className="absolute left-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--teal)] text-[10px] font-bold text-[color:var(--ivory)] tabular-nums">
                      {i + 1}
                    </span>
                  </BuilderImage>
                ) : stopImageStillLoading ? (
                  <div
                    aria-hidden="true"
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[2px] bg-[color:var(--sand)]/70 animate-pulse"
                  >
                    <span className="absolute left-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--teal)] text-[10px] font-bold text-[color:var(--ivory)] tabular-nums">
                      {i + 1}
                    </span>
                  </div>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--teal)] text-[11px] font-bold text-[color:var(--ivory)] tabular-nums">
                    {i + 1}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-[color:var(--charcoal)] leading-tight">
                    {s.label}
                  </p>
                  {s.tag && (
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[color:var(--gold)]">
                      {s.tag}
                    </p>
                  )}
                  <p className="mt-1 text-[12px] text-[color:var(--charcoal)]/60">
                    {fmtMinutes(s.duration_minutes)} on stop
                    {i > 0 && s.driveMinutesFromPrev > 0
                      ? ` · ${fmtMinutes(s.driveMinutesFromPrev)} drive`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${s.label} earlier`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)]/5 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[color:var(--charcoal)]/45"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(i, 1)}
                    disabled={i === stops.length - 1}
                    aria-label={`Move ${s.label} later`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)]/5 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[color:var(--charcoal)]/45"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveStop(s.key)}
                    aria-label={`Remove ${s.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-red-700 hover:bg-red-50"
                  >
                    <X size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        {removablePool && removablePool.length > 0 && excluded.length > 0 && (
          <div className="mt-3 rounded-[2px] border border-dashed border-[color:var(--charcoal)]/15 p-3">
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--charcoal)]/55">
              Removed — tap to add back
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {removablePool
                .filter((s) => excluded.includes(s.key))
                .map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => onAddBackStop(s.key)}
                      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-2.5 py-1 text-[11.5px] text-[color:var(--charcoal)]/75 hover:border-[color:var(--charcoal)]/35 hover:text-[color:var(--charcoal)]"
                    >
                      <Plus size={11} />
                      {s.label}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      {/* Bounded "Add to your day" rail — concierge-confirmed, no invented prices */}
      {onToggleElement && (
        <ElementsShelf selected={selectedElements ?? []} onToggle={onToggleElement} />
      )}

      {/* Pace control */}
      <section>
        <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
          Rhythm
        </span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(PACE_META) as Pace[]).map((p) => {
            const meta = PACE_META[p];
            const Icon = meta.icon;
            const active = pace === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPaceChange(p)}
                aria-pressed={active}
                className={[
                  "flex flex-col items-start gap-1 rounded-[2px] border p-2.5 text-left transition-all",
                  active
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/8 ring-1 ring-[color:var(--gold)]/40"
                    : "border-[color:var(--charcoal)]/12 hover:border-[color:var(--charcoal)]/30",
                ].join(" ")}
              >
                <Icon
                  size={14}
                  className={
                    active ? "text-[color:var(--gold)]" : "text-[color:var(--charcoal)]/55"
                  }
                  strokeWidth={1.6}
                />
                <span className="text-[12px] font-semibold text-[color:var(--charcoal)]">
                  {meta.label}
                </span>
                <span className="text-[10.5px] text-[color:var(--charcoal)]/55 leading-snug">
                  {meta.sub}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Chat with a local */}
      <section className="mt-auto rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-4">
        <p className="text-[12.5px] text-[color:var(--charcoal)]/75 leading-snug">
          Need help shaping it? A local is one message away.
        </p>
        <a
          href={builderWaHref(
            "Hi! I'm shaping a Portugal experience and could use a local's eye on the route.",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] font-bold text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
        >
          <MessageCircle size={14} strokeWidth={1.75} />
          Chat with a local
        </a>
      </section>
    </div>
  );
}
