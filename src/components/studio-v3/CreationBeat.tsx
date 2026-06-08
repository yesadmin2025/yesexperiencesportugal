// Studio V3 — Creation Storytelling layer.
//
// AtmosphereBeat: image + italic line, used for Who / Occasion.
// MapBeat: dark editorial SVG map panel (no Mapbox, no BuilderMap, no tiles),
//   used between choices to show the journey forming. Origin dot, gold route
//   line, numbered teal pins. Visual language is inspired by the homepage
//   Studio preview; rendered locally so we do not touch StudioLivePreview.
//
// Both beats render INSIDE the existing ReactionOverlay button wrapper, which
// already handles fixed positioning, click/Escape dismiss, auto-dissolve and
// prefers-reduced-motion.

interface AtmosphereBeatProps {
  /** Existing Studio V3 atmospheric image (must already be imported upstream). */
  imageSrc?: string;
  /** Uppercase gold eyebrow label. */
  eyebrow: string;
  /** One short Georgia italic line. Sentence case, no superlatives. */
  line: string;
}

export function AtmosphereBeat({ imageSrc, eyebrow, line }: AtmosphereBeatProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center px-6">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "saturate(0.92) contrast(1.04) brightness(0.6)",
          }}
        />
      ) : null}

      {/* Editorial dark wash so ivory text always meets 4.5:1. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--charcoal) 55%, transparent) 0%, color-mix(in oklab, var(--charcoal) 78%, transparent) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[480px] text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "var(--gold)" }}
        >
          <span aria-hidden>—</span> {eyebrow}
        </p>
        <p
          className="mt-5 text-[22px] sm:text-[26px] leading-[1.35] italic text-balance"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--ivory)",
            animation: "studioV3RiseIn 620ms ease-out both",
            animationDelay: "120ms",
          }}
        >
          {line}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- MapBeat ----------------------------- */

export type MapBeatMode = "origin" | "pins" | "pace";

interface MapBeatProps {
  mode: MapBeatMode;
  /** Pickup city label, e.g. "Lisbon" or "Cascais". */
  originLabel?: string | null;
  /** Real route labels from resolveStudioV3Route. Never invented. */
  routeLabels?: ReadonlyArray<string>;
  /** Drives pin count cadence for mode="pace". */
  rhythm?: "slow" | "balanced" | "full" | "immersive" | null;
  /** Uppercase gold eyebrow. */
  eyebrow: string;
  /** One Georgia italic line. */
  line: string;
}

/** Pin count by rhythm — slow = fewer, full/immersive = richer. */
function pinCountForRhythm(rhythm: MapBeatProps["rhythm"]): number {
  switch (rhythm) {
    case "slow":
      return 2;
    case "balanced":
      return 3;
    case "full":
      return 4;
    case "immersive":
      return 4;
    default:
      return 3;
  }
}

export function MapBeat({
  mode,
  originLabel,
  routeLabels,
  rhythm,
  eyebrow,
  line,
}: MapBeatProps) {
  // Determine how many pins to draw based on mode + rhythm.
  const labels = routeLabels ?? [];
  let pinCount = 0;
  if (mode === "pins") pinCount = Math.min(4, labels.length);
  else if (mode === "pace") pinCount = Math.min(pinCountForRhythm(rhythm), labels.length);
  else pinCount = 0; // origin mode: no pins

  // Fixed abstract anchor geometry. Not coordinates — never claimed as
  // such. Reads as a map panel due to grid + origin + route + pins.
  const origin = { x: 10, y: 60 };
  const anchors = [
    { x: 32, y: 38 },
    { x: 54, y: 50 },
    { x: 74, y: 28 },
    { x: 92, y: 44 },
  ];
  const visible = anchors.slice(0, pinCount);
  const showRoute = pinCount > 0;

  const path =
    showRoute && visible.length > 0
      ? `M ${origin.x} ${origin.y} ` +
        visible
          .map((p, i) => {
            const prev = i === 0 ? origin : visible[i - 1];
            const cx = (prev.x + p.x) / 2;
            const cy = Math.min(prev.y, p.y) - 6;
            return `Q ${cx} ${cy} ${p.x} ${p.y}`;
          })
          .join(" ")
      : "";

  // Approximate path length so the stroke-dasharray draw animation is
  // smooth. Cheap geometric estimate — exact length is not needed.
  const approxPathLen = showRoute ? 40 + 28 * visible.length : 0;

  const paceLabel =
    mode === "pace"
      ? rhythm === "slow"
        ? "Slow"
        : rhythm === "balanced"
          ? "Balanced"
          : rhythm === "full"
            ? "Full"
            : rhythm === "immersive"
              ? "Immersive"
              : null
      : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center px-5">
      {/* Editorial dark canvas. */}
      <div className="relative z-10 w-full max-w-[460px]">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold text-center"
          style={{ color: "var(--gold)" }}
        >
          <span aria-hidden>—</span> {eyebrow}
        </p>

        {/* The map panel. */}
        <div
          role="img"
          aria-label={
            mode === "origin"
              ? `Origin ${originLabel ?? "set"}`
              : `Route forming with ${pinCount} stop${pinCount === 1 ? "" : "s"}`
          }
          className="relative mt-5 mx-auto overflow-hidden"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background:
              "radial-gradient(120% 80% at 18% 22%, color-mix(in oklab, var(--teal) 38%, #0c1a1d) 0%, #0c1a1d 70%)",
            borderRadius: "4px",
            border:
              "1px solid color-mix(in oklab, var(--gold) 26%, transparent)",
            boxShadow:
              "0 18px 50px -28px rgba(0,0,0,0.65), 0 0 0 1px color-mix(in oklab, var(--gold) 10%, transparent) inset",
            animation: "studioV3RiseIn 620ms ease-out both",
          }}
        >
          <svg
            viewBox="0 0 100 80"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {/* Hairline editorial grid — premium contrast against the deep teal canvas. */}
            <g stroke="rgba(201,169,106,0.12)" strokeWidth="0.18">
              {[20, 40, 60].map((y) => (
                <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} />
              ))}
              {[25, 50, 75].map((x) => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="80" />
              ))}
            </g>

            {/* Origin dot with soft halo. */}
            {originLabel ? (
              <g>
                <circle
                  cx={origin.x}
                  cy={origin.y}
                  r="4.2"
                  fill="none"
                  stroke="var(--gold)"
                  strokeOpacity="0.45"
                  strokeWidth="0.5"
                  style={{
                    animation:
                      "studioV3MapBeatPulse 1800ms ease-out 200ms both",
                    transformOrigin: `${origin.x}px ${origin.y}px`,
                  }}
                />
                <circle
                  cx={origin.x}
                  cy={origin.y}
                  r="1.9"
                  fill="var(--gold)"
                  style={{
                    animation: "studioV3MapBeatFade 500ms ease-out both",
                  }}
                />
              </g>
            ) : null}

            {/* Gold route line — draws in on mount. */}
            {path ? (
              <path
                d={path}
                fill="none"
                stroke="var(--gold)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeDasharray={`${approxPathLen}`}
                strokeDashoffset={`${approxPathLen}`}
                opacity="0.95"
                style={{
                  animation: `studioV3MapBeatDraw 1100ms ease-out 280ms forwards`,
                }}
              />
            ) : null}

            {/* Numbered teal pins — sequenced fade-in. */}
            {visible.map((p, i) => (
              <g
                key={i}
                style={{
                  animation: `studioV3MapBeatFade 380ms ease-out ${
                    420 + i * 240
                  }ms both`,
                  transformOrigin: `${p.x}px ${p.y}px`,
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2.9"
                  fill="var(--teal)"
                  stroke="var(--ivory)"
                  strokeWidth="0.35"
                />
                <text
                  x={p.x}
                  y={p.y + 1.0}
                  textAnchor="middle"
                  fontSize="2.6"
                  fontWeight="700"
                  fill="var(--ivory)"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>

          {/* Origin / pace label strip. */}
          <div
            className="absolute left-0 right-0 bottom-0 flex items-center justify-between gap-3 px-3 py-1.5"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, color-mix(in oklab, #0d0d0d 75%, transparent) 100%)",
            }}
          >
            {originLabel ? (
              <span
                className="text-[9.5px] uppercase tracking-[0.24em] font-semibold truncate"
                style={{
                  color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))",
                }}
              >
                From {originLabel}
              </span>
            ) : (
              <span />
            )}
            {paceLabel ? (
              <span
                className="text-[9.5px] uppercase tracking-[0.24em] font-semibold"
                style={{
                  color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
                }}
              >
                Pace · {paceLabel}
              </span>
            ) : pinCount > 0 ? (
              <span
                className="text-[9.5px] uppercase tracking-[0.24em] font-semibold"
                style={{
                  color: "color-mix(in oklab, var(--ivory) 70%, transparent)",
                }}
              >
                {pinCount} stop{pinCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>

        {/* Real route labels (when available) — quiet ivory caption row. */}
        {pinCount > 0 && labels.length > 0 ? (
          <p
            className="mt-3 text-[11px] leading-[1.45] text-center"
            style={{
              color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
              animation: "studioV3RiseIn 600ms ease-out 600ms both",
            }}
          >
            {labels
              .slice(0, pinCount)
              .map((l) => l.split(/[—–-]/)[0].split(",")[0].trim())
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}

        {/* Italic story line. */}
        <p
          className="mt-4 text-[18px] sm:text-[22px] leading-[1.35] italic text-balance text-center"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--ivory)",
            animation: "studioV3RiseIn 620ms ease-out 220ms both",
          }}
        >
          {line}
        </p>
      </div>

      <style>{`
        @keyframes studioV3MapBeatDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes studioV3MapBeatFade {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes studioV3MapBeatPulse {
          0% { opacity: 0.0; transform: scale(0.6); }
          40% { opacity: 0.7; }
          100% { opacity: 0.0; transform: scale(1.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="studioV3MapBeatDraw"] { animation: none !important; stroke-dashoffset: 0 !important; }
          [style*="studioV3MapBeatFade"] { animation: none !important; opacity: 1 !important; transform: none !important; }
          [style*="studioV3MapBeatPulse"] { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  );
}
