// Studio V3 — Living Journey Panel (compact pill + expandable Journey Draft drawer).
//
// Replaces the older static card. The persistent artifact is now:
//   1. A small inline pill ("Your journey · forming — Wine & food · Solo")
//      that sits above the PhaseShell in normal document flow. Never fixed,
//      never overlaps the active question, choices, footer help, Continue
//      CTA, or browser chrome.
//   2. A near-fullscreen Journey Draft drawer opened on tap, showing the
//      working title, Experience DNA pills (max 4), route line, up to 3
//      moments, investment tier (only once selected), and a stylised
//      editorial route preview rendered as inline SVG (no real map lib,
//      no images, no invented stops — geometry only).
//
// Data rules (locked):
//   - Reads state ONLY through existing curation helpers.
//   - Route + moments come solely from resolveStudioV3Route — never invented.
//   - Hidden on "feeling" / "map" / "storyboard" phases and while a
//     reaction beat plays (via `hidden` prop from StudioV3).
//   - No pill until at least one meaningful DNA choice exists.
//   - No route placeholder paragraphs, no investment placeholder.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  composeJourneyTitle,
  getOptionLabel,
  resolveStudioV3Route,
} from "./curation";
import {
  COMPANIONS,
  FEELINGS,
  INTERESTS,
  INVESTMENT_TIERS,
  RHYTHMS,
  type StudioV3State,
} from "./types";

interface LivingJourneyPanelProps {
  state: StudioV3State;
  hidden?: boolean;
}

export function LivingJourneyPanel({ state, hidden = false }: LivingJourneyPanelProps) {
  const [open, setOpen] = useState(false);

  const title = useMemo(
    () =>
      composeJourneyTitle({
        feeling: state.feeling,
        companions: state.companions,
        occasion: state.occasion,
        pickup: state.pickup,
        interests: state.interests,
        rhythm: state.rhythm,
        region: null,
      }),
    [
      state.feeling,
      state.companions,
      state.occasion,
      state.pickup,
      state.interests,
      state.rhythm,
    ],
  );

  // DNA pills (max 4) — feeling · companions · rhythm · top interest.
  const dna = useMemo(() => {
    const pills: string[] = [];
    if (state.feeling) pills.push(getOptionLabel(FEELINGS, state.feeling));
    if (state.companions) pills.push(getOptionLabel(COMPANIONS, state.companions));
    if (state.rhythm) pills.push(getOptionLabel(RHYTHMS, state.rhythm));
    if (state.interests && state.interests.length > 0) {
      pills.push(getOptionLabel(INTERESTS, state.interests[0]));
    }
    return pills.slice(0, 4);
  }, [state.feeling, state.companions, state.rhythm, state.interests]);

  const meaningfulRoute =
    !!(state.feeling && state.companions && state.rhythm) &&
    !!(state.pickup || (state.interests && state.interests.length > 0));

  const resolved = useMemo(() => {
    if (!meaningfulRoute) return null;
    return resolveStudioV3Route({
      feeling: state.feeling!,
      companions: state.companions!,
      rhythm: state.rhythm!,
      interests: state.interests,
      pickup: state.pickup,
      occasion: state.occasion,
      investment: state.investment,
    });
  }, [
    meaningfulRoute,
    state.feeling,
    state.companions,
    state.rhythm,
    state.interests,
    state.pickup,
    state.occasion,
    state.investment,
  ]);

  const routeLine = resolved?.suggestedRouteLabel ?? null;
  const moments = (resolved?.routePoints ?? []).slice(0, 4).map((p) => p.label);
  const investmentLabel = state.investment
    ? getOptionLabel(INVESTMENT_TIERS, state.investment)
    : null;

  // Escape closes drawer; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Auto-close drawer when the panel is hidden (e.g. entering map/storyboard
  // or a reaction beat) so it never lingers on top of a takeover phase.
  useEffect(() => {
    if (hidden && open) setOpen(false);
  }, [hidden, open]);

  if (hidden) return null;
  if (dna.length === 0) return null; // No meaningful pick yet → no pill.

  // Collapsed copy: prefer "Route forming" once route resolved, else DNA summary.
  const dnaSummary = dna.slice(0, 2).join(" · ");
  const collapsedTrailing = routeLine ? "Route forming" : dnaSummary || "forming";

  return (
    <>
      <div className="w-full flex justify-center px-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label="Open your journey draft"
          className="group inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 transition-[transform,box-shadow,background-color] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[1px]"
          style={{
            background: "color-mix(in oklab, var(--ivory) 94%, transparent)",
            borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
            boxShadow: "0 6px 18px -14px color-mix(in oklab, var(--charcoal) 40%, transparent)",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--gold)" }}
            aria-hidden
          />
          <span
            className="text-[9px] uppercase tracking-[0.24em] font-bold leading-none whitespace-nowrap"
            style={{ color: "var(--gold)" }}
          >
            Your journey · forming
          </span>
          <span
            className="text-[10.5px] leading-none truncate max-w-[55vw]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
          >
            {collapsedTrailing}
          </span>
          <span
            className="text-[10px] leading-none ml-0.5"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            aria-hidden
          >
            ›
          </span>
        </button>
      </div>

      {open
        ? createPortal(
            <JourneyDraftDrawer
              onClose={() => setOpen(false)}
              title={title}
              dna={dna}
              routeLine={routeLine}
              moments={moments}
              investmentLabel={investmentLabel}
            />,
            document.body,
          )
        : null}
    </>
  );
}

interface DrawerProps {
  onClose: () => void;
  title: string;
  dna: string[];
  routeLine: string | null;
  moments: string[];
  investmentLabel: string | null;
}

function JourneyDraftDrawer({
  onClose,
  title,
  dna,
  routeLine,
  moments,
  investmentLabel,
}: DrawerProps) {
  const pinCount = Math.max(0, Math.min(4, moments.length));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Journey draft"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close journey draft"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-200"
      />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[6px] sm:rounded-[6px] border animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
        style={{
          background: "var(--ivory)",
          borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)",
        }}
      >
        <div className="px-5 pt-5 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[9.5px] uppercase tracking-[0.28em] font-bold"
                style={{ color: "var(--gold)" }}
              >
                Your journey draft
              </p>
              <h2
                className="mt-1 text-[18px] leading-tight font-semibold"
                style={{ color: "var(--charcoal)", fontFamily: "var(--font-display)" }}
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border transition-colors duration-150"
              style={{
                borderColor: "color-mix(in oklab, var(--charcoal) 15%, transparent)",
                color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* DNA pills */}
          {dna.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {dna.map((label) => (
                <li
                  key={label}
                  className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-semibold leading-none"
                  style={{
                    background: "color-mix(in oklab, var(--sand) 75%, transparent)",
                    color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                  }}
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : null}

          {/* Editorial route preview — pure SVG, no map lib, no images. */}
          <div
            className="relative mt-4 rounded-[4px] overflow-hidden border"
            style={{
              borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
              background:
                "radial-gradient(120% 80% at 20% 20%, color-mix(in oklab, var(--teal) 55%, #0c1a1d) 0%, #0c1a1d 65%)",
              aspectRatio: "16 / 9",
            }}
            aria-hidden
          >
            <RoutePreviewSvg pinCount={pinCount} hasRoute={!!routeLine || pinCount > 0} />
            <p
              className="absolute left-3 top-2 text-[9px] uppercase tracking-[0.26em] font-bold"
              style={{ color: "color-mix(in oklab, var(--gold) 90%, white)" }}
            >
              Route preview
            </p>
          </div>

          {/* Route line */}
          {routeLine ? (
            <p
              className="mt-3 text-[12px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              <span
                className="mr-1.5 text-[9.5px] uppercase tracking-[0.22em] font-bold"
                style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
              >
                Route
              </span>
              {routeLine}
            </p>
          ) : null}

          {/* Moments */}
          {moments.length > 0 ? (
            <div className="mt-3">
              <p
                className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
                style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
              >
                Moments so far
              </p>
              <ol
                className="mt-1.5 space-y-1 text-[12px] leading-snug"
                style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
              >
                {moments.slice(0, 3).map((m, i) => (
                  <li key={`${m}-${i}`} className="flex gap-2">
                    <span
                      className="mt-[7px] inline-block h-1 w-1 rounded-full shrink-0"
                      style={{ background: "var(--gold)" }}
                      aria-hidden
                    />
                    <span>{m}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Investment — label only, only after selection */}
          {investmentLabel ? (
            <p
              className="mt-3 text-[12px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              <span
                className="mr-1.5 text-[9.5px] uppercase tracking-[0.22em] font-bold"
                style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
              >
                Investment
              </span>
              {investmentLabel}
            </p>
          ) : null}

          {/* CTA */}
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors duration-150"
            style={{
              background: "var(--teal)",
              color: "var(--ivory)",
            }}
          >
            Continue designing
            <span aria-hidden style={{ color: "var(--gold)" }}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Editorial SVG route preview — origin dot, soft curved route line, and up to
 * 4 pins. Geometry only; never reflects real coordinates. We only render the
 * line when the resolved route is meaningful (pinCount > 0 or hasRoute true).
 */
function RoutePreviewSvg({ pinCount, hasRoute }: { pinCount: number; hasRoute: boolean }) {
  // Fixed control points across a 100x56 viewBox.
  const origin = { x: 10, y: 44 };
  const anchors = [
    { x: 30, y: 30 },
    { x: 52, y: 38 },
    { x: 72, y: 22 },
    { x: 92, y: 30 },
  ];
  const visible = anchors.slice(0, pinCount);
  const path =
    visible.length > 0
      ? `M ${origin.x} ${origin.y} ` +
        visible
          .map((p, i) => {
            const prev = i === 0 ? origin : visible[i - 1];
            const cx = (prev.x + p.x) / 2;
            const cy = Math.min(prev.y, p.y) - 4;
            return `Q ${cx} ${cy} ${p.x} ${p.y}`;
          })
          .join(" ")
      : "";

  return (
    <svg
      viewBox="0 0 100 56"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      {/* faint grid lines for atmosphere */}
      <g stroke="rgba(201,169,106,0.10)" strokeWidth="0.2">
        {[14, 28, 42].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} />
        ))}
        {[25, 50, 75].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="56" />
        ))}
      </g>

      {/* origin dot */}
      <circle cx={origin.x} cy={origin.y} r="1.6" fill="var(--gold)" />
      <circle cx={origin.x} cy={origin.y} r="3.2" fill="none" stroke="var(--gold-soft, #d8c089)" strokeOpacity="0.5" strokeWidth="0.4" />

      {/* route line */}
      {hasRoute && path ? (
        <path
          d={path}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeDasharray="1.4 1.2"
        />
      ) : null}

      {/* pins */}
      {visible.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="1.4" fill="var(--ivory)" />
          <circle cx={p.x} cy={p.y} r="0.6" fill="var(--teal)" />
        </g>
      ))}
    </svg>
  );
}
