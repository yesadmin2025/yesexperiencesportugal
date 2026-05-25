import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, ChevronUp } from "lucide-react";
import type { ComposedDay } from "@/lib/drift/composer";
import { REGION_ORIGIN, type RegionKey } from "@/data/regionStops";
import { t as tt, type DriftLocale } from "@/lib/drift/i18n";
import { recordDriftEvent } from "@/lib/drift/telemetry";
import type { DriftProfile } from "./StudioDrift";
import type { derivePrediction } from "@/lib/drift/predict";
import { StudioDrawerReco } from "./StudioDrawerReco";
import { StudioQualityBand } from "./StudioQualityBand";

const BuilderMap = lazy(() =>
  import("../BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

type Tab = "story" | "timeline" | "map";

interface Props {
  day: ComposedDay;
  region: RegionKey;
  locale: DriftLocale;
  profile?: DriftProfile;
  prediction?: ReturnType<typeof derivePrediction>;
  activeStopIndex: number;
  dense?: boolean;
}

/**
 * StudioLivePreview — Studio v4 / Fase 2.
 *
 * Two states:
 *   · PEEK (default, 84px) — same minimal map + headline + dots as the
 *     legacy ProgressiveBuildPreview, but the whole strip is now a button.
 *   · FULL (drawer) — full-height bottom sheet with 3 tabs:
 *       story    — composed paragraph + real stop bullets
 *       timeline — hour-by-hour chips (09:30, 10:30, …) from ComposedDay
 *       map      — full BuilderMap with route line
 *
 * No new dependencies (uses Tailwind + lazy BuilderMap). Mobile-first.
 * Closes on tap-outside, X, or Escape. Reduced-motion safe.
 */
export function StudioLivePreview(props: Props) {
  const { day, region, locale, profile, prediction, activeStopIndex, dense = false } = props;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("story");

  const visibleStops = Math.max(1, Math.min(day.stops.length, activeStopIndex + 1));
  const previewStops = day.stops.slice(0, visibleStops);
  const origin = REGION_ORIGIN[region];
  const last = previewStops[previewStops.length - 1]?.stop;
  if (!last || !origin) return null;

  const mapStops = previewStops.map((cs, i) => ({
    key: cs.stop.id,
    region_key: region,
    label: cs.stop.name,
    blurb: cs.stop.blurb ?? null,
    tag: null,
    lat: cs.stop.coords.lat,
    lng: cs.stop.coords.lng,
    duration_minutes: cs.stop.dwellMin,
    driveMinutesFromPrev: i === 0 ? 0 : cs.driveFromPrev,
  }));

  const confidencePct = Math.round((prediction?.revealConfidence ?? 0) * 100);

  // Timeline clock: start at 09:30, add drive + dwell after each stop.
  const timeline = useMemo(() => {
    let mins = 9 * 60 + 30;
    return day.stops.map((cs, i) => {
      mins += cs.driveFromPrev || 0;
      const start = mins;
      mins += cs.stop.dwellMin;
      const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      return {
        idx: i,
        time: fmt(start),
        name: cs.stop.name,
        drive: cs.driveFromPrev,
        dwell: cs.stop.dwellMin,
        blurb: cs.stop.blurb,
      };
    });
  }, [day.stops]);

  return (
    <>
      {/* Peek — same footprint as legacy preview, now a button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={tt("preview.expand", locale) || "Open live preview of your day"}
        className={`studio-build-preview${dense ? " is-dense" : ""} absolute inset-x-3 bottom-3 z-30 overflow-hidden rounded-[7px] motion-safe:animate-[fade-in_0.55s_ease-out_both] text-left transition-transform active:scale-[0.99]`}
        style={{
          height: 84,
          background: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.42)",
          border: "1px solid color-mix(in oklab, var(--ivory) 16%, transparent)",
        }}
      >
        <div className="grid grid-cols-[96px_1fr] items-stretch">
          <div className="relative h-[84px] overflow-hidden pointer-events-none">
            <Suspense fallback={<div className="h-full w-full bg-[color:var(--sand)]" />}>
              <BuilderMap
                stops={mapStops}
                regionCenter={{ lat: origin.lat, lng: origin.lng }}
                regionKey={region}
                emotionalMode
                activeStopIndex={mapStops.length - 1}
                chrome={false}
                locale={locale}
              />
            </Suspense>
          </div>
          <div className="relative px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p
                  className="mb-0.5 text-[9px] uppercase"
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    color: "var(--gold)",
                  }}
                >
                  {tt("build.eyebrow", locale)}
                  {confidencePct > 0 ? ` · ${confidencePct}%` : ""}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Montserrat', system-ui, sans-serif",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "var(--ivory)",
                  }}
                >
                  {last.name}
                </p>
                <p
                  className="mt-0.5 truncate"
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "9.5px",
                    lineHeight: 1.25,
                    color: "color-mix(in oklab, var(--gold) 72%, var(--ivory))",
                  }}
                >
                  {visibleStops} {tt("reveal.stops", locale) || "stops"} ·{" "}
                  {tt("preview.tap_to_open", locale) || "tap to open"}
                </p>
              </div>
              <ChevronUp
                size={16}
                aria-hidden="true"
                style={{ color: "color-mix(in oklab, var(--gold) 70%, var(--ivory))" }}
              />
            </div>
            <div className="mt-1 flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: Math.min(day.stops.length, 6) }, (_, i) => (
                <span
                  key={i}
                  className="block h-[2px] flex-1 rounded-full"
                  style={{
                    background:
                      i < visibleStops
                        ? "var(--gold)"
                        : "color-mix(in oklab, var(--ivory) 22%, transparent)",
                    transition: "background 360ms ease",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </button>

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tt("preview.dialog", locale) || "Your day — live preview"}
          className="fixed inset-0 z-[80] motion-safe:animate-[fade-in_0.25s_ease-out_both]"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          {/* sheet */}
          <div
            className="absolute inset-x-0 bottom-0 top-[12vh] flex flex-col rounded-t-[14px] motion-safe:animate-[fade-in_0.3s_ease-out_both]"
            style={{
              background: "var(--ivory)",
              boxShadow: "0 -18px 50px rgba(0,0,0,0.55)",
            }}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <span
                aria-hidden="true"
                className="block h-1 w-10 rounded-full"
                style={{ background: "color-mix(in oklab, var(--charcoal) 25%, transparent)" }}
              />
            </div>

            {/* header */}
            <div className="flex items-center justify-between px-4 pt-1 pb-2">
              <div className="min-w-0">
                <p
                  className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
                  style={{ color: "var(--gold)" }}
                >
                  {tt("build.eyebrow", locale)}
                  {confidencePct > 0 ? ` · ${confidencePct}%` : ""}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Montserrat', system-ui, sans-serif",
                    fontWeight: 700,
                    fontSize: "16px",
                    lineHeight: 1.2,
                    color: "var(--charcoal)",
                  }}
                >
                  {labelForRegion(region, locale)} · {day.stops.length}{" "}
                  {tt("reveal.stops", locale) || "stops"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-[color:var(--sand)]/60"
              >
                <X size={18} style={{ color: "var(--charcoal)" }} />
              </button>
            </div>

            {/* tabs */}
            <div
              role="tablist"
              aria-label="Preview views"
              className="mx-4 mb-2 flex items-center gap-1 rounded-full p-1"
              style={{ background: "color-mix(in oklab, var(--charcoal) 8%, transparent)" }}
            >
              {(["story", "timeline", "map"] as Tab[]).map((id) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(id)}
                    className="flex-1 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
                    style={{
                      background: active ? "var(--charcoal)" : "transparent",
                      color: active ? "var(--ivory)" : "var(--charcoal)",
                    }}
                  >
                    {tt(`preview.tab_${id}`, locale) || id}
                  </button>
                );
              })}
            </div>

            {/* content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {tab === "story" && (
                <StoryTab
                  day={day}
                  profile={profile}
                  locale={locale}
                  confidence={prediction?.revealConfidence ?? 0}
                  anchorId={day.anchorTourId}
                />
              )}
              {tab === "timeline" && <TimelineTab items={timeline} locale={locale} />}
              {tab === "map" && (
                <div
                  className="h-full min-h-[260px] overflow-hidden rounded-[10px]"
                  style={{ border: "1px solid color-mix(in oklab, var(--charcoal) 12%, transparent)" }}
                >
                  <Suspense fallback={<div className="h-full w-full bg-[color:var(--sand)]" />}>
                    <BuilderMap
                      stops={mapStops}
                      regionCenter={{ lat: origin.lat, lng: origin.lng }}
                      regionKey={region}
                      activeStopIndex={mapStops.length - 1}
                      chrome
                      locale={locale}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            {/* footer CTA */}
            <div
              className="flex items-center justify-between gap-2 px-4 pt-2 pb-4"
              style={{ borderTop: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
              >
                €145+ /guest · {tt("preview.indicative", locale) || "indicative"}
              </span>
              <Link
                to="/builder"
                search={{ legacy: "stepper" } as never}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] font-bold transition-transform active:scale-[0.98]"
                style={{ background: "var(--gold)", color: "var(--charcoal)" }}
              >
                {tt("cta.book", locale) || "Reserve"} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StoryTab({
  day,
  profile,
  locale,
  confidence,
  anchorId,
}: {
  day: ComposedDay;
  profile?: DriftProfile;
  locale: DriftLocale;
  confidence: number;
  anchorId?: string;
}) {
  return (
    <div className="space-y-1 pt-1">
      {profile && (
        <StudioDrawerReco
          profile={profile}
          locale={locale}
          confidence={confidence}
          excludeId={anchorId}
        />
      )}
      {profile && (
        <StudioQualityBand day={day} profile={profile} confidence={confidence} locale={locale} />
      )}
      <p
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: "13.5px",
          lineHeight: 1.5,
          color: "color-mix(in oklab, var(--charcoal) 88%, transparent)",
        }}
      >
        {profile?.name ? `${profile.name}, ` : ""}
        {tt("preview.story_intro", locale) ||
          `your day is forming around ${day.stops.length} real stops we've chosen for the rhythm you described.`}
      </p>
      <ul className="space-y-2.5">
        {day.stops.map((cs, i) => (
          <li
            key={cs.stop.id}
            className="flex items-start gap-2.5"
            style={{ color: "var(--charcoal)" }}
          >
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--gold)" }}
            />
            <div className="min-w-0">
              <p
                style={{
                  fontFamily: "'Montserrat', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: "13px",
                  lineHeight: 1.25,
                }}
              >
                {i + 1}. {cs.stop.name}
              </p>
              {cs.stop.blurb && (
                <p
                  className="mt-0.5"
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
                  }}
                >
                  {cs.stop.blurb}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineTab({
  items,
  locale,
}: {
  items: Array<{ idx: number; time: string; name: string; drive: number; dwell: number }>;
  locale: DriftLocale;
}) {
  return (
    <ol className="space-y-2 pt-1">
      {items.map((it) => (
        <li
          key={it.idx}
          className="flex items-center gap-3 rounded-[8px] px-3 py-2"
          style={{ background: "color-mix(in oklab, var(--sand) 55%, transparent)" }}
        >
          <span
            className="tabular-nums font-semibold"
            style={{
              fontFamily: "'Montserrat', system-ui, sans-serif",
              fontSize: "13px",
              color: "var(--charcoal)",
              minWidth: 44,
            }}
          >
            {it.time}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{
                fontFamily: "'Montserrat', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: "13px",
                color: "var(--charcoal)",
              }}
            >
              {it.name}
            </p>
            <p
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: "10.5px",
                color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              }}
            >
              {it.drive > 0
                ? `${it.drive} ${tt("preview.min_drive", locale) || "min drive"} · `
                : ""}
              {it.dwell} {tt("preview.min_stay", locale) || "min stay"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function labelForRegion(region: RegionKey, _locale: DriftLocale): string {
  const map: Record<RegionKey, string> = {
    arrabida: "Arrábida",
    "lisbon-coast": "Lisbon Coast",
    alentejo: "Alentejo",
    centro: "Centro",
  };
  return map[region];
}
