import { Link } from "@tanstack/react-router";

const STOPS = [
  { x: 68, y: 58, label: "Lisbon", caption: "Pickup" },
  { x: 108, y: 136, label: "Azeitão", caption: "Wine & local lunch" },
  { x: 154, y: 205, label: "Sesimbra", caption: "Coast & viewpoint" },
] as const;

const ROUTE_D = "M 68 58 C 78 92, 92 116, 108 136 S 138 178, 154 205";

/**
 * Homepage Studio example — a quiet, clearly illustrative panel.
 *
 * Deliberately NOT a live dashboard: no chips, no controls, no
 * visitor-specific state. One route drawing, three real place names and a
 * single subordinate link. The section's own CTA ("Open the Studio") is the
 * only primary action, so no duplicate CTA band lives inside this card.
 */
export function StudioLivePreview() {
  return (
    <figure
      className="studio-live m-0 overflow-hidden rounded-[6px] border border-[color:var(--gold)]/25 bg-[color:var(--charcoal-deep)] shadow-[0_18px_40px_-24px_rgba(46,46,46,0.42)]"
      aria-label="Example Experience Studio day from Lisbon through Azeitão to Sesimbra"
      data-testid="home-studio-example"
    >
      <div className="border-b border-[color:var(--gold)]/18 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--gold)]">
          Example
        </p>
        <p className="mt-1.5 font-serif text-[1.15rem] leading-[1.25] text-[color:var(--ivory)]">
          One private day, Lisbon to the Arrábida coast
        </p>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[5/4] md:aspect-[16/11]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_28%_18%,rgba(201,169,106,0.09)_0%,transparent_58%),radial-gradient(110%_80%_at_72%_82%,rgba(41,91,97,0.46)_0%,transparent_62%)]"
        />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 260"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 0 70 C 30 78, 60 96, 90 120 S 130 168, 160 190 S 188 220, 200 232 L 200 260 L 0 260 Z"
            fill="rgba(41,91,97,0.22)"
            stroke="rgba(201,169,106,0.18)"
            strokeWidth="0.6"
          />
          <path
            d={ROUTE_D}
            fill="none"
            stroke="var(--gold)"
            strokeOpacity="0.9"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {STOPS.map((stop, index) => (
            <g key={stop.label}>
              <circle cx={stop.x} cy={stop.y} r="5.5" fill="rgba(201,169,106,0.18)" />
              <circle
                cx={stop.x}
                cy={stop.y}
                r="2.8"
                fill={index === 0 ? "var(--teal-2)" : "var(--gold)"}
              />
            </g>
          ))}
        </svg>

        <ul aria-hidden="true" className="absolute inset-0 m-0 list-none p-0">
          {STOPS.map((stop) => {
            const xPct = (stop.x / 200) * 100;
            const left = xPct > 55;
            return (
              <li
                key={stop.label}
                className="absolute max-w-[44%]"
                style={{
                  left: `${xPct}%`,
                  top: `${(stop.y / 260) * 100}%`,
                  transform: left ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)",
                  textAlign: left ? "right" : "left",
                }}
              >
                <span className="block text-[12px] uppercase tracking-[0.16em] font-semibold text-[color:var(--ivory)] [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                  {stop.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-[color:var(--ivory)]/82 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                  {stop.caption}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <figcaption className="border-t border-[color:var(--gold)]/15 bg-[color:var(--ivory)] px-5 py-4">
        <p className="text-[14px] leading-[1.65] text-[color:var(--charcoal-soft)]">
          An illustration of how a day comes together in the{" "}
          <Link
            to="/studio-v3"
            className="text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4"
          >
            Studio
          </Link>
          . Your own route and price are drawn from your choices.
        </p>
      </figcaption>
    </figure>
  );
}
