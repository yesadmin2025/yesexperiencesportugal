import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Wine, Users, Clock3, ArrowRight, MapPin } from "lucide-react";

const STOPS = [
  { x: 68, y: 58, label: "Lisbon", caption: "Pickup" },
  { x: 108, y: 136, label: "Azeitão", caption: "Wine & local lunch" },
  { x: 154, y: 205, label: "Sesimbra", caption: "Coast & viewpoint" },
] as const;

const ROUTE_D = "M 68 58 C 78 92, 92 116, 108 136 S 138 178, 154 205";

/**
 * Homepage Studio example.
 * This deliberately never pretends to be the visitor's own draft. A genuine
 * saved Studio draft is surfaced separately by FourWaysIn.
 */
export function StudioLivePreview() {
  return (
    <div
      className="studio-live overflow-hidden rounded-[6px] border border-[color:var(--gold)]/25 bg-[color:var(--charcoal-deep)] shadow-[0_18px_40px_-20px_rgba(46,46,46,0.45)]"
      role="group"
      aria-label="Example Experience Studio day from Lisbon through Azeitão to Sesimbra"
      data-testid="home-studio-example"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[color:var(--gold)]/18 px-4 py-3 md:px-5">
        <div>
          <p className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[color:var(--gold)]">
            Example Studio day
          </p>
          <p className="mt-1 text-[13px] text-[color:var(--ivory)]/90">One custom private day</p>
        </div>
        <span className="rounded-full border border-[color:var(--gold)]/35 px-2.5 py-1 text-[12px] uppercase tracking-[0.12em] text-[color:var(--ivory)]/84">
          Not your draft
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[color:var(--gold)]/15 px-4 py-3 md:px-5">
        <Chip icon={<Wine size={12} aria-hidden="true" />} label="Wine & food" />
        <Chip icon={<Users size={12} aria-hidden="true" />} label="Couple" />
        <Chip icon={<Clock3 size={12} aria-hidden="true" />} label="Relaxed" />
      </div>

      <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[16/11] w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_28%_18%,rgba(201,169,106,0.10)_0%,transparent_55%),radial-gradient(110%_80%_at_72%_82%,rgba(41,91,97,0.50)_0%,transparent_60%)]"
        />
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.16]" viewBox="0 0 200 260" preserveAspectRatio="none">
          <defs>
            <pattern id="studio-preview-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="200" height="260" fill="url(#studio-preview-grid)" />
        </svg>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice">
          <path
            d="M 0 70 C 30 78, 60 96, 90 120 S 130 168, 160 190 S 188 220, 200 232 L 200 260 L 0 260 Z"
            fill="rgba(41,91,97,0.22)"
            stroke="rgba(201,169,106,0.18)"
            strokeWidth="0.6"
          />
          <path d={ROUTE_D} fill="none" stroke="var(--gold)" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" />
          {STOPS.map((stop, index) => (
            <g key={stop.label}>
              <circle cx={stop.x} cy={stop.y} r="5.5" fill="rgba(201,169,106,0.18)" />
              <circle cx={stop.x} cy={stop.y} r="2.8" fill={index === 0 ? "var(--teal-2)" : "var(--gold)"} />
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

      <div className="border-t border-[color:var(--gold)]/15 bg-[color:var(--ivory)] px-4 py-4 md:px-5">
        <div className="sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)]">
              See your own route and live price
            </p>
            <p className="mt-1.5 max-w-md text-[15px] md:text-[16px] leading-[1.65] text-[color:var(--charcoal-soft)]">
              Choose mood, group and rhythm in the Studio. This example is only here to show how the day comes together.
            </p>
          </div>
          <Link
            to="/studio-v3"
            className="mt-4 inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-[3px] bg-[color:var(--teal)] px-4 py-2.5 text-[12px] uppercase tracking-[0.15em] font-semibold text-[color:var(--ivory)] hover:-translate-y-0.5 sm:mt-0"
          >
            Design yours <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--charcoal-soft)]">
            <MapPin size={12} aria-hidden="true" className="text-[color:var(--teal)]" />
            Real routes · live price before payment
          </p>
          <Link
            to="/experiences"
            className="inline-flex min-h-[44px] items-center text-[12px] uppercase tracking-[0.14em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4"
          >
            Prefer a ready-made day?
          </Link>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--charcoal-deep)]/60 px-2.5 py-1.5 text-[color:var(--ivory)]">
      <span className="text-[color:var(--gold)]">{icon}</span>
      <span className="text-[12px] font-medium">{label}</span>
    </span>
  );
}
