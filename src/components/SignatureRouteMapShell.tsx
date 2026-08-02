/**
 * SignatureRouteMapShell — branded loading shell for the lazy
 * `SignatureRouteMap` section.
 *
 * Renders the exact section spacing, container width, heading block and
 * map frame dimensions of the loaded map, so the page never shows a blank
 * gap and never shifts layout when the real map hydrates.
 *
 * Content policy: no invented stops, distances or times — the shell is
 * purely structural.
 */

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

/** Shared frame classes — keep in sync with `SignatureRouteMap`. */
export const MAP_FRAME_CLASS =
  "relative overflow-hidden border border-[color:var(--gold)]/25 rounded-[6px] shadow-[0_2px_18px_rgba(46,46,46,0.06)]";
export const MAP_CANVAS_CLASS = "w-full aspect-[4/3] md:aspect-[16/9] bg-[color:var(--sand)]";

export function SignatureRouteMapShell() {
  return (
    <section className="py-14 md:py-20" aria-busy="true">
      <div className="container-x max-w-5xl">
        <div className="text-center mb-8">
          <Eyebrow flank>The route</Eyebrow>
          <SectionTitle size="compact">
            Where the <SectionTitle.Em>day goes</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] max-w-lg mx-auto">
            Loading the route map…
          </p>
        </div>

        <div className={MAP_FRAME_CLASS}>
          <div
            className={`${MAP_CANVAS_CLASS} flex items-center justify-center`}
            role="status"
            aria-live="polite"
          >
            <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Loading map
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
