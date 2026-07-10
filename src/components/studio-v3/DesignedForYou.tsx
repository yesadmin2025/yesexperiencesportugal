/**
 * DesignedForYou — up to 3 short curator notes explaining what was tuned
 * for this specific traveller (feeling, companions, considerations,
 * occasion). Reads as a signed note, not a marketing block.
 *
 * Step 6 of the post-builder plan. Content-only, presentational.
 * Notes are produced upstream by curation logic; this component enforces
 * only the cap and the tone treatment (Fraunces italic pull, muted body).
 * No invented curator name — attribution is a generic "— YES curator" so
 * we never fabricate an individual.
 */

import * as React from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

export interface DesignedForYouProps {
  readonly notes: ReadonlyArray<string>;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_NOTES = 3;

export function DesignedForYou({ notes, className, testId }: DesignedForYouProps) {
  const shown = notes.slice(0, MAX_NOTES).filter((n) => n.trim().length > 0);
  if (!shown.length) return null;
  return (
    <section
      aria-label="Designed for you"
      data-testid={testId ?? "studio-v3-designed-for-you"}
      className={cn("w-full py-6", className)}
    >
      <Eyebrow>Designed for you</Eyebrow>
      <ol className="mt-3 flex flex-col gap-4">
        {shown.map((note, i) => (
          <li
            key={i}
            className="text-[14px] leading-[1.6] italic [text-wrap:pretty]"
            style={{
              fontFamily: "var(--font-serif)",
              color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
            }}
          >
            {note}
          </li>
        ))}
      </ol>
      <p
        className="mt-4 text-[10.5px] uppercase tracking-[0.26em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        <span aria-hidden style={{ color: "var(--gold)" }}>—</span> YES curator
      </p>
    </section>
  );
}

export default DesignedForYou;
