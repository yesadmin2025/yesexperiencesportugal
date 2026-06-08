// Studio V3 — Progressive Composer Map (Phase 1: static shell, no motion).
//
// Persistent, compact, dark editorial map-style panel that sits above the
// active PhaseShell and updates progressively as the user makes choices.
// Pure presentational — reads StudioV3State and existing curation helpers
// only. No animation, no effects, no data invention, no map library.
//
// Visual language is inspired by the homepage StudioLivePreview device
// (charcoal-deep canvas, soft gold border, hairline grid, gold origin
// dot, numbered teal pin discs, gold DNA chips) but is fully scoped to
// Studio V3 and does not import or modify the homepage component.

import {
  COMPANIONS,
  FEELINGS,
  INTERESTS,
  RHYTHMS,
  type StudioV3State,
} from "./types";
import { getOptionLabel, resolveStudioV3Route } from "./curation";

interface ComposerMapProps {
  state: StudioV3State;
  hidden?: boolean;
}

export function ComposerMap({ state, hidden = false }: ComposerMapProps) {
  if (hidden) return null;

  // First meaningful pick — any of the DNA axes is set.
  const hasMeaningfulPick =
    !!state.feeling || !!state.companions || !!state.rhythm;
  if (!hasMeaningfulPick) return null;

  // DNA chips (max 4): feeling · who · rhythm · top interest.
  const chips: string[] = [];
  if (state.feeling) chips.push(getOptionLabel(FEELINGS, state.feeling));
  if (state.companions) chips.push(getOptionLabel(COMPANIONS, state.companions));
  if (state.rhythm) chips.push(getOptionLabel(RHYTHMS, state.rhythm));
  if (state.interests && state.interests.length > 0) {
    chips.push(getOptionLabel(INTERESTS, state.interests[0]));
  }
  const dnaChips = chips.slice(0, 4);

  // Only resolve a route once we have enough state — otherwise the helper
  // returns a "tailor-made" fallback with no routePoints, which is fine.
  const canResolveRoute =
    !!state.feeling && !!state.companions && !!state.rhythm;
  const resolved = canResolveRoute
    ? resolveStudioV3Route({
        feeling: state.feeling!,
        companions: state.companions!,
        rhythm: state.rhythm!,
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
      })
    : null;

  const hasPickup = !!state.pickup;
  const hasInterests = (state.interests?.length ?? 0) > 0;
  const routePoints = resolved?.routePoints ?? [];
  const pinCount = hasInterests ? Math.min(4, routePoints.length) : 0;
  const showRoute = hasInterests && pinCount > 0;

  // -------- Adaptive progress (milestone-based, not question-based) --------
  // The Studio is adaptive — some phases get skipped or inferred. So we
  // measure progress by completed CREATION milestones, never by question
  // count. Inferred guests count as a completed milestone.
  const milestones = [
    true, // Studio started (we've left intro)
    !!state.feeling,
    !!state.companions,
    !!state.occasion || !!state.dateMode,
    !!state.pickup,
    state.guests != null || state.guestsInferred,
    (state.interests?.length ?? 0) > 0,
    !!state.rhythm,
    state.considerations.length > 0 || !!state.investment,
    state.phase === "map" || state.phase === "storyboard",
  ];
  const completed = milestones.filter(Boolean).length;
  const total = milestones.length;
  const pctRaw = (completed / total) * 100;
  const pct = Math.round(pctRaw / 5) * 5; // 5% increments — feels calm.
  const progressLabel =
    pct >= 100
      ? "Ready to reveal"
      : pct >= 90
        ? "Almost ready to reveal"
        : pct >= 70
          ? "Route forming"
          : pct >= 15
            ? `${pct}% shaped`
            : "Just started";

  const statusLabel = state.investment ? "Draft ready" : "Composing your day";


  // Build aria summary.
  const ariaParts: string[] = ["Journey composer"];
  if (dnaChips.length) ariaParts.push(dnaChips.join(", "));
  if (hasPickup) ariaParts.push(`origin ${getPickupShort(state.pickup!)}`);
  if (pinCount) ariaParts.push(`${pinCount} stop${pinCount > 1 ? "s" : ""}`);

  return (
    <div className="w-full px-3 pt-2">
      <div
        role="img"
        aria-label={ariaParts.join(" · ")}
        className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-[6px] border"
        style={{
          background: "var(--charcoal-deep, #1a1a1a)",
          borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
          boxShadow:
            "0 12px 30px -18px color-mix(in oklab, var(--charcoal) 60%, transparent)",
        }}
      >
        {/* Adaptive progress whisper — thin gold line + quiet label.
            Milestone-based (not question-count) so adaptive skips never
            create a jumpy or inconsistent counter. */}
        <div
          role="progressbar"
          aria-label={`Journey ${progressLabel}`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative w-full"
          style={{ height: "1px" }}
        >
          <div
            className="h-full origin-left transition-[width] duration-[700ms] ease-out motion-reduce:transition-none"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--gold) 10%, transparent) 0%, var(--gold) 100%)",
            }}
          />
        </div>
        <div
          className="flex items-center justify-between gap-3 px-3 py-1"
          style={{
            background: "color-mix(in oklab, #0d0d0d 70%, transparent)",
          }}
        >
          <span
            className="text-[9px] uppercase font-semibold"
            style={{
              color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))",
              letterSpacing: "0.26em",
            }}
          >
            {progressLabel}
          </span>
          {hasPickup ? (
            <span
              className="text-[9px] uppercase font-semibold truncate max-w-[55%]"
              style={{
                color: "color-mix(in oklab, var(--ivory) 60%, transparent)",
                letterSpacing: "0.22em",
              }}
            >
              From {getPickupShort(state.pickup!)}
            </span>
          ) : null}
        </div>
        {/* Header strip (tablet/desktop only — keeps mobile compact) */}
        <div
          className="hidden sm:flex items-center justify-between gap-3 border-b px-3 py-1.5"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 18%, transparent)",
            background: "color-mix(in oklab, #0d0d0d 80%, transparent)",
          }}
        >
          <span
            className="text-[9.5px] uppercase tracking-[0.26em] font-bold inline-flex items-center gap-1.5"
            style={{ color: "var(--gold)" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--gold)" }}
              aria-hidden
            />
            {statusLabel}
          </span>
          {hasPickup ? (
            <span
              className="text-[9.5px] uppercase tracking-[0.22em] font-semibold truncate max-w-[55%]"
              style={{
                color: "color-mix(in oklab, var(--ivory) 70%, transparent)",
              }}
            >
              From {getPickupShort(state.pickup!)}
            </span>
          ) : null}
        </div>

        {/* Canvas */}
        <div
          className="relative w-full"
          style={{
            // Mobile: 112–128px tall. Tablet+: ~180–200px.
            aspectRatio: "16 / 7",
            maxHeight: "128px",
            minHeight: "112px",
          }}
        >
          <CanvasInner
            hasPickup={hasPickup}
            pinCount={pinCount}
            showRoute={showRoute}
          />
        </div>

        {/* Desktop canvas height override via inline class trick — second
            wrapper used only when sm+ to lift the cap (Tailwind sm prefix
            cannot override inline style maxHeight, so we render a sibling
            class-based sizer below for sm+). */}
        <style>{`
          @media (min-width: 640px) {
            .studio-v3-composer-canvas {
              max-height: 200px !important;
              min-height: 160px !important;
              aspect-ratio: 16 / 6 !important;
            }
          }
        `}</style>

        {/* DNA chip row — horizontally scrollable on tight widths. */}
        {dnaChips.length > 0 ? (
          <div
            className="flex gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar"
            style={{
              background: "color-mix(in oklab, #0d0d0d 70%, transparent)",
              borderTop:
                "1px solid color-mix(in oklab, var(--gold) 14%, transparent)",
            }}
          >
            {dnaChips.map((label) => (
              <span
                key={label}
                className="shrink-0 rounded-full px-2.5 py-[5px] text-[9.5px] uppercase tracking-[0.22em] font-semibold leading-none"
                style={{
                  border:
                    "1px solid color-mix(in oklab, var(--gold) 32%, transparent)",
                  color: "color-mix(in oklab, var(--ivory) 88%, transparent)",
                  background: "transparent",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Inner SVG canvas — faint gold grid, optional origin dot, optional
 * dashed gold route, up to 4 numbered teal pins. Geometry is fixed;
 * it does not encode real coordinates.
 */
function CanvasInner({
  hasPickup,
  pinCount,
  showRoute,
}: {
  hasPickup: boolean;
  pinCount: number;
  showRoute: boolean;
}) {
  const origin = { x: 10, y: 44 };
  const anchors = [
    { x: 30, y: 30 },
    { x: 52, y: 38 },
    { x: 72, y: 22 },
    { x: 92, y: 30 },
  ];
  const visible = anchors.slice(0, pinCount);
  const path =
    showRoute && visible.length > 0
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
    <div
      className="absolute inset-0 studio-v3-composer-canvas"
      style={{
        background:
          "radial-gradient(120% 80% at 18% 22%, color-mix(in oklab, var(--teal) 45%, #0c1a1d) 0%, #0c1a1d 70%)",
      }}
    >
      <svg
        viewBox="0 0 100 56"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* faint grid */}
        <g stroke="rgba(201,169,106,0.10)" strokeWidth="0.2">
          {[14, 28, 42].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} />
          ))}
          {[25, 50, 75].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="56" />
          ))}
        </g>

        {/* origin dot */}
        {hasPickup ? (
          <g>
            <circle
              cx={origin.x}
              cy={origin.y}
              r="3.2"
              fill="none"
              stroke="var(--gold)"
              strokeOpacity="0.45"
              strokeWidth="0.4"
            />
            <circle cx={origin.x} cy={origin.y} r="1.6" fill="var(--gold)" />
          </g>
        ) : null}

        {/* route line */}
        {path ? (
          <path
            d={path}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="0.7"
            strokeLinecap="round"
            strokeDasharray="1.4 1.2"
            opacity="0.85"
          />
        ) : null}

        {/* numbered pins */}
        {visible.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.4" fill="var(--teal)" />
            <circle
              cx={p.x}
              cy={p.y}
              r="2.4"
              fill="none"
              stroke="var(--ivory)"
              strokeWidth="0.3"
            />
            <text
              x={p.x}
              y={p.y + 0.9}
              textAnchor="middle"
              fontSize="2.4"
              fontWeight="700"
              fill="var(--ivory)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function getPickupShort(p: NonNullable<StudioV3State["pickup"]>): string {
  switch (p) {
    case "lisbon":
      return "Lisbon";
    case "lisbon-airport":
      return "Lisbon airport";
    case "lisbon-cruise":
      return "Cruise terminal";
    case "cascais-estoril":
      return "Cascais";
    case "sintra":
      return "Sintra";
    case "sesimbra-setubal-arrabida":
      return "Arrábida";
    case "comporta-troia":
      return "Comporta";
    default:
      return "Your pickup";
  }
}
