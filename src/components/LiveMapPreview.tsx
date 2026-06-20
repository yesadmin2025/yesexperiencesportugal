import { useEffect, useRef, useState } from "react";

/**
 * LiveMapPreview — a cinematic, schematic map of Portugal that
 * animates on first reveal:
 *   • the coastal route line draws itself (stroke-dashoffset)
 *   • pins pulse softly in a staggered cadence
 *   • the whole svg drifts a few pixels (parallax breath)
 *
 * Designed to sit inside the Builder section as a "live preview"
 * surrogate — it communicates "we are routing your day right now"
 * without loading a real map tile (mobile-fast, on-brand, no SDK).
 *
 * Visuals are pure SVG so the gold/teal palette is exact, and
 * everything respects prefers-reduced-motion.
 */
export function LiveMapPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Schematic Portugal-like coastline + curved interior route.
  const routeD = "M 92 38 C 86 70, 80 102, 84 138 S 92 200, 100 248 S 118 312, 138 352";

  // Stops along the route — coordinates roughly track the path.
  const stops: { x: number; y: number; label: string; delay: number }[] = [
    { x: 92, y: 38, label: "Porto", delay: 0 },
    { x: 84, y: 138, label: "Coimbra", delay: 600 },
    { x: 100, y: 248, label: "Lisboa", delay: 1200 },
    { x: 138, y: 352, label: "Algarve", delay: 1800 },
  ];

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[24rem] md:min-h-[28rem] overflow-hidden border border-[color:var(--gold)]/30 bg-[color:var(--charcoal-deep)]"
      aria-hidden="true"
    >
      {/* Atmospheric backdrop — soft radial glow, slow drift. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,rgba(201,169,106,0.10)_0%,transparent_55%),radial-gradient(110%_80%_at_70%_80%,rgba(41,91,97,0.45)_0%,transparent_60%)]" />

      {/* Topographic faint grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18]"
        preserveAspectRatio="none"
        viewBox="0 0 200 400"
      >
        <defs>
          <pattern id="lmp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="200" height="400" fill="url(#lmp-grid)" />
      </svg>

      {/* Coastline silhouette — purely decorative. */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M 50 0 C 60 60, 50 110, 60 160 S 70 240, 78 300 S 100 360, 130 400 L 0 400 L 0 0 Z"
          fill="rgba(201,169,106,0.04)"
          stroke="rgba(201,169,106,0.18)"
          strokeWidth="0.6"
        />
      </svg>

      {/* Route — animated draw */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="lmp-route" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path
          d={routeD}
          fill="none"
          stroke="url(#lmp-route)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="600"
          strokeDashoffset={active ? 0 : 600}
          style={{
            transition: "stroke-dashoffset 2400ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        />
        {/* Pins */}
        {stops.map((s, i) => (
          <g
            key={s.label}
            style={{
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(4px)",
              transition: `opacity 520ms ease ${s.delay}ms, transform 520ms ease ${s.delay}ms`,
              transformOrigin: `${s.x}px ${s.y}px`,
              transformBox: "fill-box",
            }}
          >
            <circle
              cx={s.x}
              cy={s.y}
              r="6"
              fill="var(--gold)"
              opacity="0.18"
              className={active ? "lmp-pulse" : ""}
              style={{ animationDelay: `${s.delay + 600}ms` }}
            />
            <circle cx={s.x} cy={s.y} r="2.2" fill="var(--gold)" />
            {i === stops.length - 1 && (
              <circle cx={s.x} cy={s.y} r="2.2" fill="var(--ivory)" opacity="0.9" />
            )}
          </g>
        ))}
      </svg>

      {/* Live indicator + label overlays */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between text-[color:var(--ivory)]">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--gold)] opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--gold)]" />
          </span>
          Routing
        </span>
        <span className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ivory)]/55">
          Portugal · Live
        </span>
      </div>

      {/* Stop labels — anchored to right of pins */}
      <ul className="absolute inset-0 list-none m-0 p-0 pointer-events-none">
        {stops.map((s) => (
          <li
            key={s.label}
            className="absolute text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--ivory)]/85 transition-opacity duration-700"
            style={{
              left: `${(s.x / 200) * 100}%`,
              top: `${(s.y / 400) * 100}%`,
              transform: "translate(14px, -50%)",
              opacity: active ? 1 : 0,
              transitionDelay: `${s.delay + 200}ms`,
            }}
          >
            {s.label}
          </li>
        ))}
      </ul>

      {/* Floor caption */}
      <div className="absolute left-5 bottom-5 right-5 flex items-end justify-between text-[color:var(--ivory)]/90">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
            Today's draft
          </p>
          <p className="serif italic text-[15px] md:text-[16px] mt-1.5 text-[color:var(--ivory)]/95 leading-tight">
            A road that opens to the sea.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ivory)]/55">
          4 stops · 1 day
        </span>
      </div>

      <style>{`
        @keyframes lmp-pulse {
          0%   { transform: scale(0.6); opacity: 0.55; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .lmp-pulse {
          transform-origin: center;
          transform-box: fill-box;
          animation: lmp-pulse 2400ms cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .lmp-pulse { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
