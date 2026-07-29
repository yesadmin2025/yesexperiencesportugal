/**
 * RhythmRibbon — horizontal editorial ribbon showing the rhythm of the day
 * as beats (stops) linked by driving connectors.
 *
 * Step 6 of the post-builder plan. Purely presentational: takes stop labels
 * and per-leg driving minutes; renders a compact SVG-free CSS ribbon that
 * scales on mobile (393px baseline) and stays quiet in reduced-motion.
 *
 * Visual intent: replaces the daypart timeline block. Gold dots for stops,
 * charcoal thin rules for drives, minute labels under each connector.
 * Never animated — this is a static reading aid, not a beat sequencer.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RhythmRibbonStop {
  readonly label: string;
  readonly daypart?: string; // "Morning" / "Sunset" / …
}

export interface RhythmRibbonProps {
  readonly stops: ReadonlyArray<RhythmRibbonStop>;
  /** Driving minutes between consecutive stops. length must be stops.length - 1. */
  readonly legMinutes?: ReadonlyArray<number>;
  readonly className?: string;
  readonly testId?: string;
}

function formatMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "—";
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function RhythmRibbon({ stops, legMinutes, className, testId }: RhythmRibbonProps) {
  if (stops.length < 2) return null;
  return (
    <section
      aria-label="Rhythm of your day"
      data-testid={testId ?? "studio-v3-rhythm-ribbon"}
      className={cn("w-full py-2", className)}
    >
      <ol
        className="flex items-start gap-0 overflow-x-auto no-scrollbar"
        style={{ scrollSnapType: "x proximity" }}
      >
        {stops.map((stop, i) => (
          <React.Fragment key={`${stop.label}-${i}`}>
            <li
              className="flex flex-col items-center min-w-[72px] max-w-[112px] shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              <span
                aria-hidden
                className="block rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: "var(--gold)",
                  boxShadow: "0 0 0 3px color-mix(in oklab, var(--gold) 22%, transparent)",
                }}
              />
              {stop.daypart ? (
                <span
                  className="mt-2 text-[9px] uppercase tracking-[0.24em] font-semibold"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                >
                  {stop.daypart}
                </span>
              ) : null}
              <span
                className="mt-1 text-center text-[11.5px] leading-[1.25] font-medium [text-wrap:balance]"
                style={{ color: "var(--charcoal)" }}
              >
                {stop.label}
              </span>
            </li>
            {i < stops.length - 1 ? (
              <li
                aria-hidden
                className="flex flex-col items-center justify-start shrink-0 pt-[3px] min-w-[44px]"
              >
                <span
                  className="block"
                  style={{
                    width: 32,
                    height: 1,
                    background: "color-mix(in oklab, var(--charcoal) 30%, transparent)",
                  }}
                />
                <span
                  className="mt-2 text-[9.5px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                >
                  {legMinutes && Number.isFinite(legMinutes[i])
                    ? formatMinutes(legMinutes[i])
                    : "drive"}
                </span>
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>
    </section>
  );
}

export default RhythmRibbon;
